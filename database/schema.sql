-- Tech Mentor ERP & POS — MySQL schema
-- Importable via phpMyAdmin or: mysql -u USER -p DBNAME < database/schema.sql
-- Generated from the Drizzle schema (lib/db/src/schema). Do not hand-edit;
-- regenerate with: pnpm --filter @workspace/db run gen:sql
--
-- The application also runs an idempotent ensureSchema() + seed on boot, so a
-- fresh DB can be created either by importing this file or by booting the app.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = "NO_AUTO_VALUE_ON_ZERO";

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(191) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`role` varchar(50) NOT NULL DEFAULT 'cashier',
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`branch_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);

DROP TABLE IF EXISTS `branches`;
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`phone` varchar(50),
	`email` varchar(255),
	`is_main` boolean NOT NULL DEFAULT false,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);

DROP TABLE IF EXISTS `subcategories`;
CREATE TABLE `subcategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category_id` int NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `subcategories_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `brands`;
CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `brands_name_unique` UNIQUE(`name`)
);

DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`sku` varchar(191) NOT NULL,
	`barcode` varchar(100),
	`isbn` varchar(50),
	`category_id` int,
	`sub_category_id` int,
	`branch_id` int,
	`call_number` varchar(100),
	`brand_id` int,
	`series_id` int,
	`class_id` int,
	`subject_id` int,
	`author` varchar(255),
	`edition` varchar(100),
	`cost_price` decimal(12,2) NOT NULL DEFAULT '0',
	`sale_price` decimal(12,2) NOT NULL DEFAULT '0',
	`discount_price` decimal(12,2),
	`stock` int NOT NULL DEFAULT 0,
	`low_stock_limit` int NOT NULL DEFAULT 10,
	`description` text,
	`image_url` text,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`unit` varchar(50) NOT NULL DEFAULT 'PCS',
	`business_type` varchar(50),
	`batch_number` varchar(100),
	`mfg_date` varchar(50),
	`expiry_date` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);

DROP TABLE IF EXISTS `inventory_movements`;
CREATE TABLE `inventory_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`quantity` int NOT NULL,
	`notes` text,
	`branch_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`email` varchar(255),
	`address` text,
	`password_hash` varchar(255),
	`wishlist_items` text,
	`credit_limit` decimal(12,2) NOT NULL DEFAULT '0',
	`balance` decimal(12,2) NOT NULL DEFAULT '0',
	`advance_balance` decimal(12,2) NOT NULL DEFAULT '0',
	`advance_paid_balance` decimal(12,2) NOT NULL DEFAULT '0',
	`total_orders` int NOT NULL DEFAULT 0,
	`total_spent` decimal(12,2) NOT NULL DEFAULT '0',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `customer_transactions`;
CREATE TABLE `customer_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`account` varchar(20) NOT NULL,
	`txn_type` varchar(30) NOT NULL,
	`direction` varchar(10) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`payment_method` varchar(50) NOT NULL DEFAULT 'cash',
	`reference_no` varchar(50) NOT NULL,
	`bank_ref` varchar(191),
	`note` text,
	`txn_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `customer_transactions_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`email` varchar(255),
	`address` text,
	`company` varchar(255),
	`balance` decimal(12,2) NOT NULL DEFAULT '0',
	`advance_balance` decimal(12,2) NOT NULL DEFAULT '0',
	`advance_paid_balance` decimal(12,2) NOT NULL DEFAULT '0',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `supplier_transactions`;
CREATE TABLE `supplier_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplier_id` int NOT NULL,
	`account` varchar(20) NOT NULL,
	`txn_type` varchar(30) NOT NULL,
	`direction` varchar(10) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`payment_method` varchar(50) NOT NULL DEFAULT 'cash',
	`reference_no` varchar(50) NOT NULL,
	`bank_ref` varchar(191),
	`note` text,
	`txn_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_transactions_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `ledger_entries`;
CREATE TABLE `ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`balance` decimal(12,2) NOT NULL,
	`description` text NOT NULL,
	`reference_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ledger_entries_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`discount` decimal(12,2) NOT NULL DEFAULT '0',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(191) NOT NULL,
	`customer_id` int,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`delivery_method` varchar(50) NOT NULL DEFAULT 'home_delivery',
	`payment_method` varchar(50) NOT NULL DEFAULT 'cash',
	`payment_status` varchar(50) NOT NULL DEFAULT 'pending',
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount` decimal(12,2) NOT NULL DEFAULT '0',
	`tax` decimal(12,2) NOT NULL DEFAULT '0',
	`total_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`paid_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`due_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`notes` text,
	`customer_token` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
);

DROP TABLE IF EXISTS `purchase_items`;
CREATE TABLE `purchase_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`cost_price` decimal(12,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_items_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `purchases`;
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_number` varchar(191) NOT NULL,
	`supplier_id` int NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`total_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`paid_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`due_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`notes` text,
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchases_purchase_number_unique` UNIQUE(`purchase_number`)
);

DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` varchar(191) NOT NULL,
	`username` varchar(255),
	`name` varchar(255) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`email` varchar(255),
	`cnic` varchar(50),
	`address` text,
	`role` varchar(50) NOT NULL DEFAULT 'cashier',
	`salary` decimal(12,2) NOT NULL DEFAULT '0',
	`joining_date` varchar(50) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`branch_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_employee_id_unique` UNIQUE(`employee_id`)
);

DROP TABLE IF EXISTS `delivery_assignments`;
CREATE TABLE `delivery_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`route_id` int,
	`status` varchar(50) NOT NULL DEFAULT 'assigned',
	`delivered_at` timestamp,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_assignments_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `delivery_routes`;
CREATE TABLE `delivery_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`area` varchar(255) NOT NULL,
	`vehicle` varchar(255),
	`employee_id` int,
	`delivery_date` varchar(50),
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_routes_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `cash_collections`;
CREATE TABLE `cash_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`order_id` int,
	`amount` decimal(12,2) NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'collected',
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `cash_collections_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`category` varchar(255) NOT NULL,
	`date` varchar(50) NOT NULL,
	`notes` text,
	`branch_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `sale_items`;
CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`discount` decimal(12,2) NOT NULL DEFAULT '0',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `sales`;
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_number` varchar(191) NOT NULL,
	`customer_id` int,
	`type` varchar(50) NOT NULL DEFAULT 'cash',
	`payment_method` varchar(50) NOT NULL DEFAULT 'cash',
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount` decimal(12,2) NOT NULL DEFAULT '0',
	`tax` decimal(12,2) NOT NULL DEFAULT '0',
	`total_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`paid_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`due_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`is_return` boolean NOT NULL DEFAULT false,
	`return_reason` text,
	`original_sale_id` int,
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_invoice_number_unique` UNIQUE(`invoice_number`)
);

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'info',
	`is_read` boolean NOT NULL DEFAULT false,
	`reference_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`store_name` varchar(255) NOT NULL DEFAULT 'My Store',
	`store_phone` varchar(50),
	`store_email` varchar(255),
	`store_address` text,
	`currency` varchar(10) NOT NULL DEFAULT 'PKR',
	`tax_rate` varchar(50) NOT NULL DEFAULT '0',
	`invoice_prefix` varchar(50) NOT NULL DEFAULT 'INV',
	`logo_url` text,
	`favicon_url` text,
	`dark_mode` boolean NOT NULL DEFAULT false,
	`company_name` varchar(255),
	`owner_name` varchar(255),
	`branch_name` varchar(255),
	`whatsapp_number` varchar(50),
	`stamp_url` text,
	`signature_url` text,
	`bank_name` varchar(255),
	`bank_account_title` varchar(255),
	`bank_account` varchar(100),
	`bank_iban` varchar(100),
	`bank_branch_code` varchar(50),
	`jazzcash_number` varchar(50),
	`easypaisa_number` varchar(50),
	`qr_code_url` text,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `whatsapp_config`;
CREATE TABLE `whatsapp_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`automation_enabled` boolean NOT NULL DEFAULT false,
	`provider` varchar(50) NOT NULL DEFAULT 'wasms',
	`default_language` varchar(5) NOT NULL DEFAULT 'en',
	`meta_access_token` text,
	`meta_phone_number_id` varchar(100),
	`meta_api_version` varchar(20) NOT NULL DEFAULT 'v22.0',
	`wasms_api_key` varchar(255),
	`wasms_whatsapp_id` varchar(100),
	`custom_api_url` text,
	`custom_api_method` varchar(10) NOT NULL DEFAULT 'POST',
	`custom_auth_header` text,
	`custom_content_type` varchar(100) NOT NULL DEFAULT 'application/json',
	`custom_body_template` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_config_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `whatsapp_logs`;
CREATE TABLE `whatsapp_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(20) NOT NULL DEFAULT 'manual',
	`entity_id` int,
	`recipient_name` varchar(255),
	`phone` varchar(50) NOT NULL,
	`trigger` varchar(100),
	`template_name` varchar(255),
	`message` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'sent',
	`error` text,
	`provider` varchar(50),
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_logs_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `whatsapp_templates`;
CREATE TABLE `whatsapp_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`trigger` varchar(100) NOT NULL,
	`message` text NOT NULL,
	`language` varchar(5) NOT NULL DEFAULT 'en',
	`business_type` varchar(50),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_templates_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `purchase_return_items`;
CREATE TABLE `purchase_return_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`return_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`cost_price` decimal(12,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_return_items_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `purchase_returns`;
CREATE TABLE `purchase_returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`return_number` varchar(191) NOT NULL,
	`purchase_id` int,
	`supplier_id` int,
	`total_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`notes` text,
	`return_reason` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_returns_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_returns_return_number_unique` UNIQUE(`return_number`)
);

DROP TABLE IF EXISTS `book_classes`;
CREATE TABLE `book_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `book_classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `book_classes_name_unique` UNIQUE(`name`)
);

DROP TABLE IF EXISTS `book_subjects`;
CREATE TABLE `book_subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `book_subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `book_subjects_name_unique` UNIQUE(`name`)
);

DROP TABLE IF EXISTS `publisher_series`;
CREATE TABLE `publisher_series` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brand_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `publisher_series_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `business_config`;
CREATE TABLE `business_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`active_business_types` json NOT NULL,
	`primary_business_type` varchar(50),
	`enabled_modules` json NOT NULL,
	`applied_packs` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `business_config_id` PRIMARY KEY(`id`)
);

DROP TABLE IF EXISTS `units`;
CREATE TABLE `units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `units_id` PRIMARY KEY(`id`),
	CONSTRAINT `units_name_unique` UNIQUE(`name`)
);
CREATE INDEX `customer_txn_customer_idx` ON `customer_transactions` (`customer_id`);CREATE INDEX `customer_txn_date_idx` ON `customer_transactions` (`txn_date`);CREATE INDEX `supplier_txn_supplier_idx` ON `supplier_transactions` (`supplier_id`);CREATE INDEX `supplier_txn_date_idx` ON `supplier_transactions` (`txn_date`);CREATE INDEX `whatsapp_log_created_idx` ON `whatsapp_logs` (`created_at`);CREATE INDEX `whatsapp_log_entity_idx` ON `whatsapp_logs` (`entity_type`,`entity_id`);

-- Singleton configuration rows. These tables hold exactly one row (id = 1).
-- JSON / TEXT columns cannot carry a SQL DEFAULT, so the row is inserted here.
INSERT INTO `whatsapp_config` (`id`, `custom_body_template`)
VALUES (1, '{"to":"{{to}}","message":"{{message}}"}')
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `business_config` (`id`, `active_business_types`, `enabled_modules`, `applied_packs`)
VALUES (1, '[]', '{}', '[]')
ON DUPLICATE KEY UPDATE `id` = `id`;

SET FOREIGN_KEY_CHECKS = 1;
