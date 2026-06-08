-- ───────────────────────────────────────────────────────────────────────────
-- Tech Mentor ERP & POS — SAFE UPGRADE for an EXISTING installation (MySQL/MariaDB)
-- ───────────────────────────────────────────────────────────────────────────
-- Use this ONLY on a database that already has data and that you do NOT want to
-- wipe. It adds any MISSING columns, tables, and indexes and never drops data.
-- It is idempotent: running it again does nothing harmful.
--
-- HOW TO RUN:  phpMyAdmin -> select your database -> "SQL" tab -> paste -> Go.
--
-- ALTERNATIVE (no SQL needed): just deploy the new code. On first boot the app's
-- ensureSchema() applies exactly these same changes automatically.
--
-- For a BRAND-NEW / EMPTY database use database/schema.sql or
-- database/erp-full-dump.sql instead (those DROP and recreate tables).
-- ───────────────────────────────────────────────────────────────────────────

-- ── idempotent helper procedures ────────────────────────────────────────────
DROP PROCEDURE IF EXISTS _add_col;
DELIMITER //
CREATE PROCEDURE _add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = col
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS _add_idx;
DELIMITER //
CREATE PROCEDURE _add_idx(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = tbl AND index_name = idx
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = tbl
  ) THEN
    SET @s = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '` (', cols, ')');
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END //
DELIMITER ;

-- ── new COLUMNS on existing tables ───────────────────────────────────────────
CALL _add_col('sales', 'original_sale_id', 'original_sale_id int');
CALL _add_col('sales', 'created_by_id', 'created_by_id int');
CALL _add_col('purchases', 'created_by_id', 'created_by_id int');
CALL _add_col('products', 'business_type', 'business_type varchar(50)');
CALL _add_col('customers', 'advance_balance', 'advance_balance decimal(12,2) NOT NULL DEFAULT 0');
CALL _add_col('customers', 'advance_paid_balance', 'advance_paid_balance decimal(12,2) NOT NULL DEFAULT 0');
CALL _add_col('suppliers', 'advance_balance', 'advance_balance decimal(12,2) NOT NULL DEFAULT 0');
CALL _add_col('suppliers', 'advance_paid_balance', 'advance_paid_balance decimal(12,2) NOT NULL DEFAULT 0');
CALL _add_col('whatsapp_templates', 'language', "language varchar(5) NOT NULL DEFAULT 'en'");
CALL _add_col('whatsapp_templates', 'business_type', 'business_type varchar(50)');

-- ── new TABLES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_transactions (
  id int AUTO_INCREMENT PRIMARY KEY,
  customer_id int NOT NULL,
  account varchar(20) NOT NULL,
  txn_type varchar(30) NOT NULL,
  direction varchar(10) NOT NULL,
  amount decimal(12,2) NOT NULL,
  payment_method varchar(50) NOT NULL DEFAULT 'cash',
  reference_no varchar(50) NOT NULL,
  bank_ref varchar(191),
  note text,
  txn_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_id int,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_transactions (
  id int AUTO_INCREMENT PRIMARY KEY,
  supplier_id int NOT NULL,
  account varchar(20) NOT NULL,
  txn_type varchar(30) NOT NULL,
  direction varchar(10) NOT NULL,
  amount decimal(12,2) NOT NULL,
  payment_method varchar(50) NOT NULL DEFAULT 'cash',
  reference_no varchar(50) NOT NULL,
  bank_ref varchar(191),
  note text,
  txn_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_id int,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id int AUTO_INCREMENT PRIMARY KEY,
  entity_type varchar(20) NOT NULL DEFAULT 'manual',
  entity_id int,
  recipient_name varchar(255),
  phone varchar(50) NOT NULL,
  `trigger` varchar(100),
  template_name varchar(255),
  message text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'sent',
  error text,
  provider varchar(50),
  created_by_id int,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id int AUTO_INCREMENT PRIMARY KEY,
  automation_enabled boolean NOT NULL DEFAULT false,
  provider varchar(50) NOT NULL DEFAULT 'wasms',
  meta_access_token text,
  meta_phone_number_id text,
  meta_api_version varchar(50) NOT NULL DEFAULT 'v22.0',
  wasms_api_key text,
  wasms_whatsapp_id text,
  custom_api_url text,
  custom_api_method varchar(50) NOT NULL DEFAULT 'POST',
  custom_auth_header text,
  custom_content_type varchar(100) NOT NULL DEFAULT 'application/json',
  custom_body_template text NOT NULL,
  default_language varchar(5) NOT NULL DEFAULT 'en',
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CALL _add_col('whatsapp_config', 'default_language', "default_language varchar(5) NOT NULL DEFAULT 'en'");

CREATE TABLE IF NOT EXISTS business_config (
  id int AUTO_INCREMENT PRIMARY KEY,
  active_business_types json NOT NULL,
  primary_business_type varchar(50),
  enabled_modules json NOT NULL,
  applied_packs json NOT NULL,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
  id int AUTO_INCREMENT PRIMARY KEY,
  name varchar(191) NOT NULL UNIQUE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── new INDEXES ──────────────────────────────────────────────────────────────
CALL _add_idx('customer_transactions', 'customer_txn_customer_idx', 'customer_id');
CALL _add_idx('customer_transactions', 'customer_txn_date_idx', 'txn_date');
CALL _add_idx('supplier_transactions', 'supplier_txn_supplier_idx', 'supplier_id');
CALL _add_idx('supplier_transactions', 'supplier_txn_date_idx', 'txn_date');
CALL _add_idx('whatsapp_logs', 'whatsapp_log_created_idx', 'created_at');
CALL _add_idx('whatsapp_logs', 'whatsapp_log_entity_idx', 'entity_type, entity_id');
CALL _add_idx('products', 'products_status_business_type_idx', 'status, business_type');

-- ── singleton config rows (id = 1) ───────────────────────────────────────────
INSERT IGNORE INTO whatsapp_config (id, custom_body_template)
  VALUES (1, '{"to":"{{to}}","message":"{{message}}"}');
INSERT IGNORE INTO business_config (id, active_business_types, enabled_modules, applied_packs)
  VALUES (1, '[]', '{}', '[]');

-- ── cleanup helpers ──────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS _add_col;
DROP PROCEDURE IF EXISTS _add_idx;
