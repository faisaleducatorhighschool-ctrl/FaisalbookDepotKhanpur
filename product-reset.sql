-- ============================================================================
-- FRESH START RESET  (DESTRUCTIVE — cannot be undone)
-- ----------------------------------------------------------------------------
-- KEEPS your master data: product names, SKUs, categories, subcategories,
--   brands, publishers/series, book classes/subjects, prices, customers,
--   suppliers, employees, branches, settings and login users.
--
-- CLEARS all history so the app starts clean:
--   * Billing / POS history   (sales, sale items, returns)
--   * Order history           (orders, order items)
--   * Purchase history        (purchases, purchase items, purchase returns)
--   * Inventory movements      (stock in/out/adjustment + opening stock)
--   * Ledger, cash collections, expenses, notifications, delivery assignments
--   * Sets every product's stock on hand to 0
--
-- It also makes sure the newer "original_sale_id" column exists, so older
-- databases work with the latest app without any extra step.
--
-- HOW TO RUN ON THE LIVE SITE:
--   1. Open your Hostinger PostgreSQL database console (Query / SQL tab).
--   2. Paste this entire file and run it.
--   3. It runs inside a transaction — if anything fails, nothing changes.
-- ============================================================================

BEGIN;

-- 0. Make sure the latest column exists (safe to run repeatedly).
ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_sale_id integer;

-- 1. Wipe every transactional / history table and reset their ID counters.
--    CASCADE clears any rows that reference these tables.
TRUNCATE
  sale_items,
  sales,
  order_items,
  orders,
  purchase_items,
  purchases,
  purchase_return_items,
  purchase_returns,
  inventory_movements,
  ledger_entries,
  cash_collections,
  expenses,
  notifications,
  delivery_assignments
RESTART IDENTITY CASCADE;

-- 2. Reset every product's stock on hand to 0 (catalog is preserved).
UPDATE products SET stock = 0;

COMMIT;
