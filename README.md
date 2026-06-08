# Tech Mentor ERP & POS

A full-featured enterprise retail management platform for electronics and tech retail businesses.

| Artifact | Path | Description |
|---|---|---|
| **ERP Admin Panel** | `/` | 19-module ERP (POS, orders, inventory, customers, reports…) |
| **Online Store** | `/store/` | Customer-facing e-commerce storefront |
| **REST API** | `/api/` | Express 5 backend — shared by ERP and Store |
| **Employee Mobile App** | iOS / Android | Expo React Native app for staff |

---

## Tech Stack

- **Monorepo:** pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React 19 + Vite, shadcn/ui, Tailwind CSS, TanStack Query, wouter
- **Mobile:** Expo SDK 54, Expo Router, React Native
- **API:** Express 5, Zod validation, Orval OpenAPI codegen
- **Database:** PostgreSQL 15+ with Drizzle ORM
- **Auth:** JWT — ERP staff uses `erp_token`, store customers use `store_token`

---

## Prerequisites

- **Node.js 24+** — `node --version`
- **pnpm 10+** — `npm install -g pnpm@10`
- **PostgreSQL 15+** — running locally or via a cloud provider

---

## Local Development

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in DATABASE_URL and SESSION_SECRET
```

Generate a secure `SESSION_SECRET`:
```bash
openssl rand -hex 64
```

### 4. Create the database and push the schema

```bash
# Create the database first (if it doesn't exist)
createdb techmentor

# Push Drizzle schema (creates all tables + seeds admin user)
pnpm --filter @workspace/db run push
```

### 5. Start the services

Open three terminals:

```bash
# Terminal 1 — API server (proxied at /api)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — ERP web panel (proxied at /)
BASE_PATH=/ PORT=5173 pnpm --filter @workspace/smart-retail-erp run dev

# Terminal 3 — Online Store (proxied at /store/)
BASE_PATH=/store/ PORT=5174 pnpm --filter @workspace/store run dev
```

### 6. Open the app

- ERP Admin: [http://localhost:5173](http://localhost:5173) — login: `admin` / `admin123`
- Online Store: [http://localhost:5174/store/](http://localhost:5174/store/)
- API Health: [http://localhost:8080/api/healthz](http://localhost:8080/api/healthz)

### 7. Employee Mobile App (optional)

```bash
cd artifacts/employee-app
EXPO_PUBLIC_DOMAIN=localhost:8080 npx expo start
```
Scan the QR code with **Expo Go** on your phone.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `SESSION_SECRET` | **Yes** | JWT signing secret (min 64 hex chars) |
| `NODE_ENV` | No | `development` \| `production` (default: development) |
| `PORT` | Auto | Injected by Railway — do not set manually in production |
| `EXPO_PUBLIC_DOMAIN` | Mobile only | Railway domain for Expo bundle API calls |

See `.env.example` for a full template.

---

## Project Structure

```
.
├── artifacts/
│   ├── api-server/          # Express 5 API server
│   ├── smart-retail-erp/    # ERP React/Vite frontend
│   ├── store/               # Online Store React/Vite frontend
│   └── employee-app/        # Expo React Native mobile app
├── lib/
│   ├── db/                  # Drizzle ORM schema + push config
│   ├── api-spec/            # OpenAPI 3.1 spec (source of truth)
│   ├── api-zod/             # Generated Zod validators (do not edit)
│   └── api-client-react/    # Generated React Query hooks (do not edit)
├── .env.example             # Environment variable template
├── railway.toml             # Railway deployment config
├── nixpacks.toml            # Nixpacks build config (Railway fallback)
└── pnpm-workspace.yaml      # pnpm monorepo config
```

---

## Deploying to Railway

### Prerequisites

- Railway account: [railway.app](https://railway.app)
- GitHub repository with this project
- Railway CLI (optional): `npm install -g @railway/cli`

---

### Step 1 — Push to GitHub

```bash
# If this is a new repo:
git init
git add .
git commit -m "Initial commit — Tech Mentor ERP & POS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# For subsequent pushes:
git add .
git commit -m "your message"
git push
```

---

### Step 2 — Create Railway project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **Deploy from GitHub repo**
3. Authorize Railway and select your repository
4. Railway will detect `railway.toml` automatically

---

### Step 3 — Add PostgreSQL

1. In your Railway project, click **+ New**
2. Select **Database → PostgreSQL**
3. Railway automatically injects `DATABASE_URL` into your service — no action needed

---

### Step 4 — Set environment variables

In your Railway service settings → **Variables**, add:

```
SESSION_SECRET=<your-64-char-hex-string>
NODE_ENV=production
```

Generate `SESSION_SECRET` locally:
```bash
openssl rand -hex 64
```

> **Do not** set `PORT` or `DATABASE_URL` — Railway injects both automatically.

---

### Step 5 — Deploy

Click **Deploy** (or push to `main` — Railway auto-deploys on push).

Railway will:
1. Run `pnpm install --frozen-lockfile`
2. Build the API server (esbuild)
3. Build the ERP frontend (Vite → `artifacts/smart-retail-erp/dist/public/`)
4. Build the Store frontend (Vite → `artifacts/store/dist/public/`)
5. On start: run `drizzle push` (creates all DB tables) then start the server

---

### Step 6 — Verify

After deployment, visit your Railway domain:

| URL | Expected |
|---|---|
| `https://YOUR_APP.up.railway.app/api/healthz` | `{"status":"ok"}` |
| `https://YOUR_APP.up.railway.app/` | ERP login page |
| `https://YOUR_APP.up.railway.app/store/` | Online store |

Login: `admin` / `admin123`

---

## Mobile App — Android Build (APK / AAB)

> iOS is published via **Replit's Expo Launch** (click Publish in Replit).  
> Android requires EAS CLI — run these commands on your **local machine**, not on Replit.

### Prerequisites

```bash
npm install -g eas-cli
eas login
```

### First-time setup

```bash
cd artifacts/employee-app
eas init   # links to your Expo account, creates eas.json
```

### Build APK (sideloading / testing)

```bash
EXPO_PUBLIC_DOMAIN=YOUR_APP.up.railway.app eas build --platform android --profile preview
```

### Build AAB (Google Play submission)

```bash
EXPO_PUBLIC_DOMAIN=YOUR_APP.up.railway.app eas build --platform android --profile production
```

### Required `eas.json`

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_DOMAIN": "YOUR_APP.up.railway.app" }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "env": { "EXPO_PUBLIC_DOMAIN": "YOUR_APP.up.railway.app" }
    }
  }
}
```

---

## Deployment Checklist

### Before pushing to GitHub

- [ ] `.env` is **not** committed (check with `git status` — should not appear)
- [ ] `.env.example` has all required variables documented
- [ ] `pnpm install` runs cleanly
- [ ] `pnpm --filter @workspace/api-server run build` succeeds locally

### Railway setup

- [ ] PostgreSQL plugin added to Railway project
- [ ] `SESSION_SECRET` set in Railway Variables (64+ char hex string)
- [ ] `NODE_ENV=production` set in Railway Variables
- [ ] `DATABASE_URL` is **not** manually set (Railway injects it from the PostgreSQL plugin)

### After first deploy

- [ ] `/api/healthz` returns `{"status":"ok"}`
- [ ] ERP login page loads at `/`
- [ ] Login works with `admin` / `admin123`
- [ ] Online Store loads at `/store/`
- [ ] Store product listing shows products
- [ ] API logs show no errors in Railway dashboard

### Optional / Mobile

- [ ] Set `EXPO_PUBLIC_DOMAIN` in `eas.json` to your Railway domain
- [ ] EAS build succeeds for Android
- [ ] Mobile app login works with `admin` / `admin123`

---

## API Reference

Base URL: `/api`

| Module | Key Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Dashboard | `GET /dashboard/stats`, `GET /dashboard/recent-orders`, `GET /dashboard/sales-chart` |
| Products | `CRUD /products`, `GET /products/low-stock` |
| Orders | `CRUD /orders`, `PATCH /orders/:id/status` |
| Customers | `CRUD /customers`, `GET /customers/:id/ledger` |
| Reports | `GET /reports/sales`, `GET /reports/inventory`, `GET /reports/profit-loss` |
| Store | `POST /store/auth/register`, `CRUD /store/orders`, `GET /store/track/:number` |

Full spec: `lib/api-spec/openapi.yaml`

---

## Default Credentials

| Service | Username | Password |
|---|---|---|
| ERP Admin | `admin` | `admin123` |
| Employee App | `admin` | `admin123` |

> Change these immediately after first login in production.

---

## License

MIT
