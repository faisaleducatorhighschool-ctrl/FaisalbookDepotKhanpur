# Tech Mentor ERP & POS

A full-featured enterprise retail management platform covering POS, orders, inventory, customers, suppliers, employees, deliveries, expenses, reports, and WhatsApp notifications.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied to /api)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run gen:sql` — regenerate `database/schema.sql` (phpMyAdmin-importable) from the Drizzle schema
- Required env: `DATABASE_URL` — MySQL connection string, `SESSION_SECRET` — for JWT signing
- Dev preview runs on a local MariaDB (started by the `MySQL Database` workflow); `MYSQL_URL` overrides `DATABASE_URL` in that environment

## Deploy (GitHub → Hostinger MySQL)

Single web service: the API server also serves the three web apps as static SPAs:
- `/` → ERP admin (`smart-retail-erp`)
- `/store` → storefront (`store`)
- `/customer-app` → customer web app (`customer-app`)
- `/api` → API; unknown `/api/*` returns JSON 404 (never the SPA shell)

### Database (MySQL)

- The whole app runs on **MySQL** (local dev uses MariaDB; production uses Hostinger MySQL).
- Create the database in Hostinger, then **import `database/schema.sql` via phpMyAdmin** (or `mysql -u USER -p DBNAME < database/schema.sql`). It creates all 32 tables and the singleton config rows, and is re-import idempotent (`DROP TABLE IF EXISTS`).
- `database/schema.sql` is generated from the Drizzle schema — never hand-edit it; run `pnpm --filter @workspace/db run gen:sql` after schema changes.
- On boot the app also runs an idempotent `ensureSchema()` + seed, so a fresh DB can be set up either by importing the SQL or by booting the app. Hostinger MySQL has **no auto-migrate**, so new columns are added by `ensureSchema()` on boot — re-importing the schema or relying on boot keeps the DB current.

### Hostinger (Node.js app from GitHub)

- Deploy as a **Node.js app from the GitHub repo** (Hostinger ZIP upload rejects this prebuilt multi-SPA bundle — use GitHub import, framework "Other").
- **Env vars**: `DATABASE_URL` (the Hostinger MySQL connection string), `SESSION_SECRET` (long random string), `NODE_ENV=production`. Set `DATABASE_SSL=true` only when connecting over a public endpoint that requires TLS. `PORT` is provided by the host.
- Build order: api-server (esbuild → `artifacts/api-server/dist/index.mjs`), then each frontend with `BASE_PATH` baked in (`/`, `/store/`, `/customer-app/`) → `dist/public`.
- Start boots the server with `NODE_ENV=production` so static serving activates.
- The Expo `employee-app` is a mobile app and is **not** part of the web deploy.

### Railway (alternative)

`railway.toml` (mirrored by `nixpacks.toml`) provides a one-service Railway path: add a MySQL plugin + web service from GitHub, set `DATABASE_URL`/`SESSION_SECRET`, and the build/start commands are read automatically. Start runs `db push` then boots the server.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, shadcn/ui, Tailwind, TanStack Query
- API: Express 5 (async handlers, `req.log` for logging, never `console.log`)
- DB: MySQL (MariaDB in dev) + Drizzle ORM via `mysql2` (`lib/db`)
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
- `artifacts/api-server/src/seed.ts` — idempotent `ensureSchema()` (MySQL) + seeds admin user, sample data, and singleton config rows on startup
- `artifacts/smart-retail-erp/src/pages/` — all 19 ERP pages
- `artifacts/smart-retail-erp/src/components/` — AuthProvider, ThemeProvider, AdminLayout, Sidebar

## Architecture decisions

- JWT auth: token in localStorage as `erp_token`; custom Orval fetch interceptor reads it. No cookies/sessions needed.
- Orval hook pattern: hooks with query params take `(params, options)`, hooks without params take just `(options)`. The `query.queryKey` field is required when passing query options.
- API server port 8080, shared proxy maps `/api` → API server; frontend at `/` on port from `$PORT`.
- bcryptjs (not bcrypt) — avoids native bindings in Nix environment.
- Express 5 rules: all async handlers must be `async (req, res): Promise<void>` and use `res.json(); return;` not `return res.json()`.
- MySQL/Drizzle: inserts use `$returningId()` then a follow-up select (no `.returning()`); upserts use `.onDuplicateKeyUpdate({ set })` or `INSERT IGNORE`; `ilike`→`like` (ci collation). Raw `db.execute()` returns `[rows, fields]` — use the `xr()` helper to get rows.
- JSON columns use the custom `jsonColumn` type (`lib/db/src/schema/_json.ts`), not drizzle's built-in `json`. drizzle 0.45.2's `MySqlJson` has no read-side mapper and MariaDB returns JSON as a raw string, so the built-in type leaks strings to the app; `jsonColumn` parses on read across both MariaDB and MySQL.
- JSON/TEXT columns can't carry a SQL DEFAULT in MySQL, so singleton config rows (`whatsapp_config` id=1, `business_config` id=1) are inserted explicitly by `ensureSchema()` and by `database/schema.sql`.

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
