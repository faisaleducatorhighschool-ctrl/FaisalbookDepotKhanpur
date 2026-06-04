# Tech Mentor ERP & POS

A full-featured enterprise retail management platform covering POS, orders, inventory, customers, suppliers, employees, deliveries, expenses, reports, and WhatsApp notifications.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied to /api)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — for JWT signing

## Deploy on Railway (GitHub)

Single web service: the API server also serves the three web apps as static SPAs:
- `/` → ERP admin (`smart-retail-erp`)
- `/store` → storefront (`store`)
- `/customer-app` → customer web app (`customer-app`)
- `/api` → API; unknown `/api/*` returns JSON 404 (never the SPA shell)

Config lives in `railway.toml` (and a mirrored `nixpacks.toml`). On Railway:
- Add a **PostgreSQL** plugin and a **web service** from the GitHub repo.
- **Build / Start commands** come from `railway.toml` (no manual entry needed).
- **Env vars**: `DATABASE_URL` (link the Railway Postgres), `SESSION_SECRET` (long random string). Set `DATABASE_SSL=true` only if you use the *public* Postgres URL (the internal `*.railway.internal` URL does not need it). `PORT` is provided by Railway.
- Build order: api-server (esbuild → `artifacts/api-server/dist/index.mjs`), then each frontend with `BASE_PATH` baked in (`/`, `/store/`, `/customer-app/`) → `dist/public`.
- Start runs `db push` (creates tables on a fresh DB) then boots the server with `NODE_ENV=production` so static serving activates.
- The Expo `employee-app` is a mobile app and is **not** part of the Railway deploy.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, shadcn/ui, Tailwind, TanStack Query
- API: Express 5 (async handlers, `req.log` for logging, never `console.log`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval from OpenAPI spec (`lib/api-spec` → `lib/api-zod`, `lib/api-client-react`)
- Auth: JWT stored as `erp_token` in localStorage; `custom-fetch.ts` sends it automatically
- Build: esbuild (CJS bundle for API)

## Where things live

- `lib/db/src/schema/index.ts` — all DB table definitions (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for API types)
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (do not edit)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (do not edit)
- `lib/api-client-react/src/custom-fetch.ts` — injects JWT into every request
- `artifacts/api-server/src/routes/` — all route handlers
- `artifacts/api-server/src/lib/seed.ts` — seeds admin user + sample data on startup
- `artifacts/smart-retail-erp/src/pages/` — all 19 ERP pages
- `artifacts/smart-retail-erp/src/components/` — AuthProvider, ThemeProvider, AdminLayout, Sidebar

## Architecture decisions

- JWT auth: token in localStorage as `erp_token`; custom Orval fetch interceptor reads it. No cookies/sessions needed.
- Orval hook pattern: hooks with query params take `(params, options)`, hooks without params take just `(options)`. The `query.queryKey` field is required when passing query options.
- API server port 8080, shared proxy maps `/api` → API server; frontend at `/` on port from `$PORT`.
- bcryptjs (not bcrypt) — avoids native bindings in Nix environment.
- Express 5 rules: all async handlers must be `async (req, res): Promise<void>` and use `res.json(); return;` not `return res.json()`.

## Product

19-module ERP covering:
- **Dashboard** — KPI cards, sales chart, recent orders
- **POS** — split-panel point-of-sale with cart and checkout
- **Orders / Purchases** — order/PO management with status tracking
- **Products / Categories / Brands** — catalog management with stock alerts
- **Inventory** — movement tracking (stock in/out/adjustment) + summary view
- **Customers / Suppliers** — ledger balances, totals, CRUD
- **Employees** — staff records with roles and salary
- **Routes / Deliveries** — delivery route planning and assignment
- **Cash Collections / Expenses** — financial tracking
- **Reports** — sales, inventory, and P&L reports with charts
- **Notifications / WhatsApp** — system alerts and message templates
- **Settings** — store config, currency, tax, dark mode

Login: `admin` / `admin123`

## Gotchas

- Orval query params naming: use `QueryParams` suffix, not `Params` (e.g. `GetSalesReportQueryParams`).
- SalesChart API returns `{ date, sales, orders }` — no `revenue` or `total` field.
- Product stock alert threshold is `lowStockLimit`, not `minStockLevel`.
- Expense date field is `date`, not `expenseDate`.
- Settings uses `storePhone`, `storeEmail`, `storeAddress` (not `phone`, `email`, `address`).
- WhatsApp template fields: `trigger` and `message` (not `triggerEvent` / `messageTemplate`).
- Routes API uses `vehicle` and `employeeId` (not `vehicleNumber` / `assignedEmployeeId`).
- Order/Purchase total is `totalAmount` (not `total`).
- Always run codegen after editing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
