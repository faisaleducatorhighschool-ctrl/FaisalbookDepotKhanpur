# Tech Mentor ERP & POS — Independent Deployment Guide

This guide lets you run, update, and deploy the project **without Replit** and
**without any Replit-generated GitHub token**. Once you push this code to your own
GitHub repository and connect it to Hostinger, every future update is fully under
your control.

---

## 0. What you own after exporting

After you download the export package and push it to your GitHub repo, you fully own:

| Asset                     | Where it lives in this project                                  |
| ------------------------- | -------------------------------------------------------------- |
| **Source code**           | `artifacts/`, `lib/`, `scripts/`                               |
| **Database structure**    | `database/schema.sql` (structure only, re-import safe)         |
| **Database data**         | `database/erp-full-dump.sql` (structure **+** your current data) |
| **Safe upgrade script**   | `database/upgrade.sql` (adds missing columns/tables to an existing DB, no data loss) |
| **Build configuration**   | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `nixpacks.toml`, `railway.toml`, `tsconfig*.json` |
| **Deployment config**     | `.github/workflows/deploy-hostinger.yml`, `hostinger-deploy/` |
| **Environment template**  | `.env.example`                                                 |

Nothing in the code depends on Replit. The Replit-only files (`.replit`,
`replit.nix`, `.replitignore`) are harmless on GitHub/Hostinger and are simply
ignored there — you can keep or delete them.

---

## 1. Disconnect Replit ↔ GitHub sync

This is a one-time action **inside Replit** (it does not touch your code):

1. In Replit, open the **Git** tab (left sidebar).
2. Open its **settings** (gear / three-dots menu) and choose **Disconnect from GitHub**
   (or "Remove remote").
3. Optionally, in your GitHub account: **Settings → Applications → Authorized OAuth Apps**
   (and **Developer settings → Personal access tokens**) and revoke any token/app
   that was created for Replit.

From here on you upload to GitHub yourself (Section 3). The project has no runtime
dependency on Replit sync.

---

## 2. Required environment variables

Set these on your host (Hostinger dashboard → your Node app → **Environment variables**).
A template is in `.env.example`.

| Variable         | Required | Purpose                                                                 |
| ---------------- | -------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`   | **Yes**  | MySQL connection string: `mysql://DB_USER:DB_PASSWORD@HOST:3306/DB_NAME` |
| `SESSION_SECRET` | **Yes**  | Secret for signing login tokens. Use a long random string (`openssl rand -hex 64`). |
| `NODE_ENV`       | **Yes**  | Set to `production` (turns on serving of the 3 web apps).               |
| `DATABASE_SSL`   | No       | Set to `true` only if your MySQL host requires TLS over a public endpoint. |
| `PORT`           | No       | Hostinger injects this automatically. Leave unset on Hostinger.        |

**Never commit `.env`** — it is already in `.gitignore`. Only `.env.example` is shared.

---

## 3. Required database settings & import

The whole app runs on **MySQL** (Hostinger MySQL in production).

1. In Hostinger **hPanel → Databases → MySQL**, create a database + user, and note
   the host, database name, user, and password. Put them into `DATABASE_URL`.
2. Open **phpMyAdmin** for that database and **Import** one of:
   - `database/erp-full-dump.sql` — structure **plus your current data** (recommended for a copy of what you have now), **or**
   - `database/schema.sql` — empty structure only (fresh start; the app seeds an
     admin user and config rows on first boot).
3. Both files are safe to re-import (`DROP TABLE IF EXISTS` at the top).

The app also self-heals the schema on boot (adds any missing columns), so a fresh
database can be set up either by importing the SQL or just by booting the app once.

Default login after a fresh setup: **`admin` / `admin123`**.

### Upgrading an EXISTING database (keeping your data)
If you already run an older copy of the ERP with real data, **do not** re-import
`schema.sql` (it drops tables). Instead, upgrade safely one of two ways:
- **Automatic (recommended):** just deploy the new code. On first boot the app adds
  any missing columns, tables, and indexes by itself — no data loss.
- **Manual:** in phpMyAdmin run `database/upgrade.sql`. It is idempotent (safe to run
  again) and only adds what's missing.

The recent schema additions both of these apply:
- **New columns:** `sales.original_sale_id`, `sales.created_by_id`,
  `purchases.created_by_id`, `products.business_type`,
  `customers.advance_balance`, `customers.advance_paid_balance`,
  `suppliers.advance_balance`, `suppliers.advance_paid_balance`,
  `whatsapp_templates.language`, `whatsapp_templates.business_type`,
  `whatsapp_config.default_language`.
- **New tables:** `customer_transactions`, `supplier_transactions`, `whatsapp_logs`,
  `whatsapp_config`, `business_config`, `units`.
- **New indexes:** on the tables above plus `products (status, business_type)`.

---

## 4. Upload the project to your own GitHub repo (no token needed)

Pick **one** method. All use your normal GitHub login — no Replit token.

### Method A — GitHub Desktop (easiest, recommended)
1. Download/extract the export ZIP to a folder on your computer.
2. Install **GitHub Desktop**, sign in.
3. **File → Add local repository** → pick that folder → **create a repository** when prompted.
4. Click **Publish repository** (choose Private or Public). Done.

### Method B — Git command line
```bash
cd path/to/extracted-project
git init
git add .
git commit -m "Initial import: Tech Mentor ERP & POS"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/<YOUR_REPO>.git
git push -u origin main
```

### Method C — GitHub website (for small changes / single files)
On your repo page: **Add file → Upload files** (drag the folders in) or
**Add file → Create new file** and paste content. The web UI is the only way to add
files under `.github/workflows/` without a token-scope issue.

---

## 5. Build instructions

Local requirements: **Node.js 24** and **pnpm 10** (`npm install -g pnpm@10`).

```bash
pnpm install --frozen-lockfile --prod=false      # install everything

pnpm --filter @workspace/api-server run build      # bundle the Express API server

# Build the three web apps, each with its public base path baked in:
PORT=3000 BASE_PATH=/             NODE_ENV=production pnpm --filter @workspace/smart-retail-erp run build
PORT=3001 BASE_PATH=/store/       NODE_ENV=production pnpm --filter @workspace/store run build
PORT=3002 BASE_PATH=/customer-app/ NODE_ENV=production pnpm --filter @workspace/customer-app run build
```

This produces:
- `artifacts/api-server/dist/` — the server bundle
- `artifacts/smart-retail-erp/dist/public`, `artifacts/store/dist/public`,
  `artifacts/customer-app/dist/public` — the three built web apps the server serves.

One server serves all three apps by path: `/` = ERP admin, `/store` = storefront,
`/customer-app` = customer app, `/api` = the API.

---

## 6. Hostinger deployment

You have **two** independent options. Choose whichever you prefer.

### Option 1 — Hostinger "Node.js app from GitHub" (build on the server)
1. hPanel → **Website / Node.js** → **Create application** → **Import from GitHub**,
   pick your repo, framework **Other**, branch `main`.
2. Build command (runs the steps from Section 5 — also captured in `nixpacks.toml`):
   ```
   npm install -g pnpm@10 && pnpm install --frozen-lockfile --prod=false && pnpm --filter @workspace/api-server run build && PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/smart-retail-erp run build && PORT=3001 BASE_PATH=/store/ NODE_ENV=production pnpm --filter @workspace/store run build && PORT=3002 BASE_PATH=/customer-app/ NODE_ENV=production pnpm --filter @workspace/customer-app run build
   ```
3. Start command:
   ```
   NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs
   ```
4. Add the environment variables from Section 2.
5. Import the database (Section 3) and **restart** the app.

> Note: Hostinger's **ZIP upload** option rejects this multi-app bundle — use the
> **GitHub import** path above (framework "Other").

### Option 2 — GitHub Actions builds & uploads over FTP (zero server build)
The workflow `.github/workflows/deploy-hostinger.yml` is already included. On every
push to `main` it builds everything and uploads the ready-to-run bundle to Hostinger
over FTP.

To enable it, add these in **GitHub → your repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret                  | Value                                                  |
| ----------------------- | ----------------------------------------------------- |
| `HOSTINGER_FTP_SERVER`  | FTP host (hPanel → Files → FTP Accounts)              |
| `HOSTINGER_FTP_USERNAME`| FTP username                                          |
| `HOSTINGER_FTP_PASSWORD`| FTP password                                          |

Optional repository **variable** `HOSTINGER_FTP_SERVER_DIR` sets the upload folder
(default is `/domains/your-domain/public_node/`). After the upload, restart the Node
app in hPanel. `DATABASE_URL` / `SESSION_SECRET` are still set in the Hostinger
dashboard (Section 2), never in GitHub.

---

## 7. Future updates (fully self-managed)

1. Edit code on your computer.
2. Commit and push to your GitHub `main` branch (GitHub Desktop or `git push`).
3. Hostinger redeploys — automatically (Option 2 / GitHub auto-deploy) or by clicking
   **Deploy/Pull** in hPanel (Option 1).

No Replit, no Replit sync, no Replit token is involved at any step.

---

## 8. The Expo employee app (optional, separate)

`artifacts/employee-app` is a **mobile** app and is **not** part of the web deploy.
Build/ship it separately with Expo/EAS if you need it. Point it at your deployed API
by setting `EXPO_PUBLIC_DOMAIN` to your live domain.
