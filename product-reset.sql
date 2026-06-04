-- ============================================================================
-- PRODUCT MASTER DATA RESET  (DESTRUCTIVE — cannot be undone)
-- ----------------------------------------------------------------------------
-- KEEPS your catalog: product names, SKUs, categories, subcategories, brands,
--   publishers/series, prices and all product structure.
-- CLEARS: every product's stock to 0, and permanently DELETES all purchase
--   history, purchase items, purchase returns, and inventory movements
--   (which is where "opening stock" entries live).
--
-- HOW TO RUN ON THE LIVE SITE:
--   1. Open your Railway/Hostinger PostgreSQL database console (Query tab).
--   2. Paste this entire file and run it.
--   3. It runs inside a transaction — if anything fails, nothing changes.
-- ============================================================================

BEGIN;

-- 1. Delete purchase history (line items first, then headers).
DELETE FROM purchase_items;
DELETE FROM purchases;

-- 2. Delete purchase returns (line items first, then headers).
DELETE FROM purchase_return_items;
DELETE FROM purchase_returns;

-- 3. Delete all inventory movements (stock-in / stock-out / adjustment / opening stock).
DELETE FROM inventory_movements;

-- 4. Reset every product's stock on hand to 0 (catalog is preserved).
UPDATE products SET stock = 0;

COMMIT;
