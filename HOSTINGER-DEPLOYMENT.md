# Tech Mentor ERP — Final Hostinger Deployment Guide

Everything you need to deploy and maintain the ERP independently (no Replit).
The single Node server runs the API **and** serves all three web apps:
`/` = ERP admin, `/store` = storefront, `/customer-app` = customer app.

---

## 1. The complete `.env.example`

```env
# ── Database ──────────────────────────────────────────────────────────────────
# REQUIRED. MySQL connection string.
# Hostinger:  mysql://DB_USER:DB_PASSWORD@HOST:3306/DB_NAME
DATABASE_URL=mysql://user:password@localhost:3306/techmentor

# Optional. Dev-only override that takes precedence over DATABASE_URL.
# Leave UNSET in production.
# MYSQL_URL=mysql://root@127.0.0.1:3306/erp

# Optional. Set "true" only when MySQL is reached over a public endpoint
# that requires TLS. Not needed for localhost / internal networking.
# DATABASE_SSL=true

# ── Auth / JWT ────────────────────────────────────────────────────────────────
# REQUIRED. Secret used to sign login tokens. 64+ char random hex.
# Generate:  openssl rand -hex 64
SESSION_SECRET=change_me_to_a_64_char_or_longer_random_hex_string

# ── Node Environment ──────────────────────────────────────────────────────────
# Use "production" when deploying. Enables static frontend serving.
NODE_ENV=production

# ── Server Port ───────────────────────────────────────────────────────────────
# Hostinger injects $PORT automatically — leave UNSET there.
# PORT=8080

# ── Mobile App (Expo) — NOT part of the web deploy ────────────────────────────
# The public hostname (no https://) the Expo bundle uses to reach the API.
# EXPO_PUBLIC_DOMAIN=your-deploy-domain.example.com
```

---

## 2. Environment variables required for production

| Variable        | Required?    | Purpose                                              |
| --------------- | ------------ | ---------------------------------------------------- |
| `DATABASE_URL`  | ✅ Required   | MySQL connection string                              |
| `SESSION_SECRET`| ✅ Required   | Signs login (JWT) tokens                             |
| `NODE_ENV`      | ✅ Required   | Must be `production` (enables static serving)        |
| `DATABASE_SSL`  | ⛔ Optional   | `true` only if MySQL requires TLS over public access |
| `PORT`          | ⛔ Optional   | Hostinger sets it automatically — leave unset        |
| `MYSQL_URL`     | ⛔ Dev only   | Local-dev override — leave unset in production        |
| `EXPO_PUBLIC_DOMAIN` | ⛔ Mobile only | Only for the Expo app, not the web deploy        |

**Bottom line:** in production you only set **`DATABASE_URL`**, **`SESSION_SECRET`**, **`NODE_ENV=production`**.

---

## 3. Sample values

```env
DATABASE_URL=mysql://u123_admin:MyP%40ss123@localhost:3306/u123_techmentor
SESSION_SECRET=9f2b7c1d8e4a6f0b3c5d7e9f1a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b
NODE_ENV=production
# DATABASE_SSL=true   # uncomment only if your MySQL host needs TLS
```

Notes:
- URL-encode special characters in the DB password: `@`→`%40`, `#`→`%23`, `:`→`%3A`, `/`→`%2F`. (Above, the password `MyP@ss123` became `MyP%40ss123`.)
- Hostinger MySQL host is usually `localhost`; DB name and user are prefixed (e.g. `u123_...`).
- Generate `SESSION_SECRET` with `openssl rand -hex 64`.

---

## 4. Recommended Node.js version

**Node.js 24** (LTS-class, what the project is built/tested on). Node **20+** also works. In Hostinger's Node.js app, pick the highest available 20/22/24.

---

## 5. Exact install command

```bash
npm install -g pnpm@10 && pnpm install --frozen-lockfile --prod=false
```

`--prod=false` is required so the build tools (Vite, esbuild, TypeScript) install.

---

## 6. Exact build command

```bash
pnpm --filter @workspace/api-server run build && \
PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/smart-retail-erp run build && \
PORT=3001 BASE_PATH=/store/ NODE_ENV=production pnpm --filter @workspace/store run build && \
PORT=3002 BASE_PATH=/customer-app/ NODE_ENV=production pnpm --filter @workspace/customer-app run build
```

This builds the API bundle, then the three frontends with their correct base paths baked in.

---

## 7. Exact start command

```bash
NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs
```

The server reads `DATABASE_URL`, runs an idempotent schema check/seed on boot, then serves the API and all three SPAs on `$PORT`.

---

## 8. Is object-storage configuration required?

**No — it is optional.** The ERP runs fully without any object storage. Object storage is used by **one feature only**: the built-in product-image *uploader*.

- If `PRIVATE_OBJECT_DIR` / `PUBLIC_OBJECT_SEARCH_PATHS` are **not set** (the case on Hostinger), the app degrades gracefully: the upload endpoint returns `501`, and you can still set product images by **pasting an image URL**.
- The built-in uploader uses Replit's storage sidecar, which does **not** exist on Hostinger. So to get in-app uploads working on Hostinger, replace it (see §9).
- Everything else — login, POS, orders, inventory, customers, suppliers, reports, WhatsApp — works with no storage config.

---

## 9. Replacing the Replit image uploader

The product form currently uploads like this (`artifacts/smart-retail-erp/src/pages/Products.tsx`, ~line 110):

```ts
const res = await fetch("/api/storage/uploads/request-url", { /* ... */ });
const { uploadURL, objectPath } = await res.json();
await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
onChange(`/api/storage${objectPath}`);   // saved into product.imageUrl
```

Pick ONE of the options below. `onChange(finalUrl)` is all the form needs — it just stores a URL string in `product.imageUrl`.

### Option A — Image URLs only (zero code, simplest)
Do nothing. In the product form, paste a hosted image URL (from your own CDN, a free image host, etc.) into the Image field. Works immediately on Hostinger.

### Option B — Cloudinary (recommended, free tier, no server changes)
1. Create a free Cloudinary account → note your **Cloud name**.
2. Settings → Upload → add an **unsigned** upload preset → note its name.
3. Replace the upload block above with:

```ts
const form = new FormData();
form.append("file", file);
form.append("upload_preset", "YOUR_UNSIGNED_PRESET");

const res = await fetch(
  "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
  { method: "POST", body: form }
);
if (!res.ok) throw new Error("Upload failed");
const data = await res.json();
onChange(data.secure_url);   // Cloudinary HTTPS URL stored in imageUrl
```

No server changes, no env vars needed (uploads are unsigned and client-side). Cloudinary serves and optimizes the images.

### Option C — Local uploads on Hostinger disk (self-hosted)
Store files on the server's disk and serve them statically.

1. Install multer in the API server:
   ```bash
   pnpm --filter @workspace/api-server add multer && \
   pnpm --filter @workspace/api-server add -D @types/multer
   ```
2. Add an upload route (e.g. `artifacts/api-server/src/routes/uploads.ts`):
   ```ts
   import { Router, type IRouter } from "express";
   import multer from "multer";
   import { randomUUID } from "crypto";
   import path from "path";
   import { requireAuth } from "../middlewares/auth.js";

   const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
   const storage = multer.diskStorage({
     destination: UPLOAD_DIR,
     filename: (_req, file, cb) =>
       cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
   });
   const upload = multer({
     storage,
     limits: { fileSize: 5 * 1024 * 1024 },
     fileFilter: (_req, file, cb) =>
       cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
   });

   const router: IRouter = Router();
   router.post("/uploads/image", requireAuth, upload.single("file"), (req, res): void => {
     if (!req.file) { res.status(400).json({ error: "No file" }); return; }
     res.json({ url: `/api/uploads/files/${req.file.filename}` });
   });
   export default router;
   ```
3. Mount it and serve the folder in `artifacts/api-server/src/app.ts`:
   ```ts
   import express from "express";
   import uploadsRouter from "./routes/uploads.js";
   app.use("/api", uploadsRouter);
   app.use("/api/uploads/files", express.static(path.resolve(process.cwd(), "uploads")));
   ```
4. Replace the client upload block:
   ```ts
   const form = new FormData();
   form.append("file", file);
   const res = await fetch("/api/uploads/image", { method: "POST", body: form });
   if (!res.ok) throw new Error("Upload failed");
   const { url } = await res.json();
   onChange(url);
   ```
5. Create the `uploads/` folder on the server (Hostinger persistent storage) and make sure it isn't wiped on redeploy. **Caveat:** some hosts use ephemeral disks — files can vanish on rebuild. Cloudinary (Option B) avoids this. Add `uploads/` to `.gitignore`.

---

## 10. Final deployment checklist

1. ☐ Create a MySQL database in Hostinger (note host / DB / user / password).
2. ☐ Import `database/erp-full-dump.sql` via phpMyAdmin (structure + data) — or `database/schema.sql` for an empty start.
3. ☐ Verify 35 tables exist: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE();`
4. ☐ In Hostinger, create a **Node.js app from GitHub** (framework: Other, branch `main`), Node 24.
5. ☐ Set the **install** command (§5).
6. ☐ Set the **build** command (§6).
7. ☐ Set the **start** command (§7).
8. ☐ Set env vars: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production` (§3).
9. ☐ Deploy / restart the app.
10. ☐ Open `/` and log in with **`admin` / `admin123`**, then change the default passwords. Confirm `/store` and `/customer-app` load.

**Default logins (seeded on first boot):** `admin` / `admin123` (admin) and `manager` / `manager123` (manager).

Your ERP now runs fully independently — no Replit required.
