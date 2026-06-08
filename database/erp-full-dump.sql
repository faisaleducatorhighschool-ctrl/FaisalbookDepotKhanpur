/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `book_classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_classes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `book_classes_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `book_classes` WRITE;
/*!40000 ALTER TABLE `book_classes` DISABLE KEYS */;
INSERT INTO `book_classes` VALUES
(1,'Nursery',1,'2026-06-07 13:07:58'),
(2,'KG',2,'2026-06-07 13:07:58'),
(3,'Class 1',3,'2026-06-07 13:07:58'),
(4,'Class 2',4,'2026-06-07 13:07:58'),
(5,'Class 3',5,'2026-06-07 13:07:58'),
(6,'Class 4',6,'2026-06-07 13:07:58'),
(7,'Class 5',7,'2026-06-07 13:07:58'),
(8,'Class 6',8,'2026-06-07 13:07:58'),
(9,'Class 7',9,'2026-06-07 13:07:58'),
(10,'Class 8',10,'2026-06-07 13:07:58'),
(11,'Class 9',11,'2026-06-07 13:07:58'),
(12,'Class 10',12,'2026-06-07 13:07:58'),
(13,'Class 11',13,'2026-06-07 13:07:58'),
(14,'Class 12',14,'2026-06-07 13:07:58');
/*!40000 ALTER TABLE `book_classes` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `book_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_subjects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `book_subjects_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `book_subjects` WRITE;
/*!40000 ALTER TABLE `book_subjects` DISABLE KEYS */;
INSERT INTO `book_subjects` VALUES
(1,'English','2026-06-07 13:07:58'),
(2,'Urdu','2026-06-07 13:07:58'),
(3,'Mathematics','2026-06-07 13:07:58'),
(4,'General Science','2026-06-07 13:07:58'),
(5,'Social Studies','2026-06-07 13:07:58'),
(6,'Islamiyat','2026-06-07 13:07:58'),
(7,'Computer Science','2026-06-07 13:07:58'),
(8,'Physics','2026-06-07 13:07:58'),
(9,'Chemistry','2026-06-07 13:07:58'),
(10,'Biology','2026-06-07 13:07:58'),
(11,'Pakistan Studies','2026-06-07 13:07:58'),
(12,'Civics','2026-06-07 13:07:58'),
(13,'History','2026-06-07 13:07:58'),
(14,'Geography','2026-06-07 13:07:58'),
(15,'Drawing & Arts','2026-06-07 13:07:58'),
(16,'Home Economics','2026-06-07 13:07:58');
/*!40000 ALTER TABLE `book_subjects` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_main` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES
(1,'Main Branch','123 Main Street, Karachi','+92-300-0000000','main@smartretail.com',1,'active','2026-06-07 13:07:58','2026-06-07 13:07:58');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `brands_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES
(1,'Samsung','Korean electronics giant','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(2,'Apple','American technology company','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(3,'Nike','Athletic footwear and apparel','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(4,'Nestlé','Swiss food and beverage company','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(5,'Generic','Generic / unbranded products','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(6,'Punjab Textbook Board','Official Punjab government textbook publisher','2026-06-07 13:07:58','2026-06-07 13:14:08'),
(7,'Afaq Publishers','Private textbook publisher','2026-06-07 13:07:58','2026-06-07 13:14:08'),
(8,'Conti Publishers','Private textbook publisher','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(9,'Book Wise','Private textbook and guide publisher','2026-06-07 13:07:58','2026-06-07 13:14:08'),
(10,'Oxford University Press','OUP Pakistan textbooks','2026-06-07 13:07:58','2026-06-07 13:14:08'),
(11,'Cambridge University Press','Cambridge Pakistan textbooks','2026-06-07 13:07:58','2026-06-07 13:14:08'),
(12,'Paramount Books','Private textbook publisher','2026-06-07 13:07:58','2026-06-07 13:14:08'),
(13,'National Book Foundation','National Book Foundation Pakistan','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(14,'Federal Board','Federal Board of Intermediate & Secondary Education','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(15,'MM Publications','MM Publications Pakistan','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(16,'Rehman Publishers',NULL,'2026-06-07 13:14:08','2026-06-07 13:14:08');
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `business_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `active_business_types` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`active_business_types`)),
  `primary_business_type` varchar(50) DEFAULT NULL,
  `enabled_modules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`enabled_modules`)),
  `applied_packs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`applied_packs`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `business_config` WRITE;
/*!40000 ALTER TABLE `business_config` DISABLE KEYS */;
INSERT INTO `business_config` VALUES
(1,'[]',NULL,'{}','[\"book_store\"]','2026-06-08 11:58:56');
/*!40000 ALTER TABLE `business_config` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `cash_collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_collections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'collected',
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cash_collections` WRITE;
/*!40000 ALTER TABLE `cash_collections` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_collections` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES
(1,'Electronics','Electronic devices and accessories','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(2,'Clothing','Apparel and fashion items','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(3,'Food & Beverages','Consumable food products','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(4,'Home & Garden','Household and garden items','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(5,'Health & Beauty','Personal care products','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(6,'Books & Stationery','Textbooks, notebooks and stationery','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(7,'Stationery','School & office stationery items','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(8,'Textbooks','School and college textbooks','2026-06-07 13:14:08','2026-06-07 13:14:08'),
(9,'Guides & Notes','Keynotes, guides and solved papers','2026-06-07 13:14:08','2026-06-07 13:14:08'),
(10,'Novels & Literature','Fiction and general reading','2026-06-07 13:14:08','2026-06-07 13:14:08'),
(11,'Children\'s Books','Story and activity books','2026-06-07 13:14:08','2026-06-07 13:14:08'),
(12,'Islamic Books','Religious and Islamic studies','2026-06-07 13:14:08','2026-06-07 13:14:08');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customer_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `account` varchar(20) NOT NULL,
  `txn_type` varchar(30) NOT NULL,
  `direction` varchar(10) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `reference_no` varchar(50) NOT NULL,
  `bank_ref` varchar(191) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `txn_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `customer_txn_customer_idx` (`customer_id`),
  KEY `customer_txn_date_idx` (`txn_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customer_transactions` WRITE;
/*!40000 ALTER TABLE `customer_transactions` DISABLE KEYS */;
INSERT INTO `customer_transactions` VALUES
(1,1,'receivable','payment_received','credit',20.00,'cash','RCV-000001',NULL,NULL,'2026-06-08 09:03:41',1,'2026-06-08 09:03:41'),
(4,2,'advance','advance_deposit','credit',100.00,'cash','ADV-000004',NULL,NULL,'2026-06-08 10:04:34',1,'2026-06-08 10:04:34');
/*!40000 ALTER TABLE `customer_transactions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `wishlist_items` text DEFAULT NULL,
  `credit_limit` decimal(12,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_orders` int(11) NOT NULL DEFAULT 0,
  `total_spent` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `advance_balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `advance_paid_balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES
(1,'Ahmed Khan','+92-321-1234567','ahmed.khan@gmail.com','45 Garden Road, Karachi',NULL,NULL,50000.00,0.00,0,0.00,'2026-06-07 13:07:58','2026-06-07 13:07:58',0.00,0.00),
(2,'Sara Ahmed','+92-332-9876543','sara.ahmed@hotmail.com','12 Defence Phase 6, Karachi',NULL,NULL,100000.00,0.00,0,0.00,'2026-06-07 13:07:58','2026-06-07 13:07:58',100.00,0.00),
(3,'Muhammad Ali','+92-300-5555555',NULL,'78 Gulshan-e-Iqbal Block 7, Karachi',NULL,NULL,25000.00,0.00,0,0.00,'2026-06-07 13:07:58','2026-06-07 13:07:58',0.00,0.00);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `delivery_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `route_id` int(11) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'assigned',
  `delivered_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `delivery_assignments` WRITE;
/*!40000 ALTER TABLE `delivery_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_assignments` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `delivery_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `area` varchar(255) NOT NULL,
  `vehicle` varchar(255) DEFAULT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `delivery_date` varchar(50) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `delivery_routes` WRITE;
/*!40000 ALTER TABLE `delivery_routes` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_routes` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(191) NOT NULL,
  `username` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `cnic` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'cashier',
  `salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `joining_date` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `branch_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_employee_id_unique` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `category` varchar(255) NOT NULL,
  `date` varchar(50) NOT NULL,
  `notes` text DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `inventory_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `inventory_movements` WRITE;
/*!40000 ALTER TABLE `inventory_movements` DISABLE KEYS */;
INSERT INTO `inventory_movements` VALUES
(1,8,'stock_out',1,'Supplier return PR-1780909899341 (other)',NULL,'2026-06-08 09:11:39'),
(2,10,'stock_out',2,'Supplier return PR-1780909899341 (other)',NULL,'2026-06-08 09:11:39'),
(3,33,'stock_out',1,'Supplier return PR-1780909899341 (other)',NULL,'2026-06-08 09:11:39');
/*!40000 ALTER TABLE `inventory_movements` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `ledger_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ledger_entries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `balance` decimal(12,2) NOT NULL,
  `description` text NOT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ledger_entries` WRITE;
/*!40000 ALTER TABLE `ledger_entries` DISABLE KEYS */;
INSERT INTO `ledger_entries` VALUES
(1,'supplier',3,'debit',154.00,-154.00,'Purchase return PR-1780909899341 — other',1,'2026-06-08 09:11:39');
/*!40000 ALTER TABLE `ledger_entries` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'info',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `reference_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(191) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `delivery_method` varchar(50) NOT NULL DEFAULT 'home_delivery',
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `payment_status` varchar(50) NOT NULL DEFAULT 'pending',
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `due_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `customer_token` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_order_number_unique` (`order_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `sku` varchar(191) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `isbn` varchar(50) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `sub_category_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `call_number` varchar(100) DEFAULT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `series_id` int(11) DEFAULT NULL,
  `class_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `author` varchar(255) DEFAULT NULL,
  `edition` varchar(100) DEFAULT NULL,
  `cost_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sale_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount_price` decimal(12,2) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `low_stock_limit` int(11) NOT NULL DEFAULT 10,
  `description` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `unit` varchar(50) NOT NULL DEFAULT 'PCS',
  `batch_number` varchar(100) DEFAULT NULL,
  `mfg_date` varchar(50) DEFAULT NULL,
  `expiry_date` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `business_type` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_sku_unique` (`sku`),
  KEY `products_status_business_type_idx` (`status`,`business_type`)
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES
(1,'Samsung Galaxy A54 5G','SAM-A54-5G','8806094921670',NULL,1,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,55000.00,72000.00,NULL,0,5,'Mid-range Android smartphone with 6.4\" Super AMOLED display, 50MP camera, and 5000mAh battery.','https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=600&fit=crop','active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','electronics'),
(2,'iPhone 14 128GB','APL-IP14-128','194253374459',NULL,1,NULL,NULL,NULL,2,NULL,NULL,NULL,NULL,NULL,130000.00,175000.00,NULL,0,3,'Apple iPhone 14 with A15 Bionic chip, 12MP dual-camera system, and all-day battery life.','https://images.unsplash.com/photo-1657722703838-cb32b01be53e?w=600&h=600&fit=crop','active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','electronics'),
(3,'Nike Air Max 270','NKE-AM270-BLK','888409843652',NULL,2,NULL,NULL,NULL,3,NULL,NULL,NULL,NULL,NULL,12000.00,18500.00,NULL,0,5,'Nike Air Max 270 running shoes with the largest heel Air unit yet for all-day comfort.','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop','active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','garments'),
(4,'Nestlé Milo 500g','NES-MILO-500','8901058857136',NULL,3,NULL,NULL,NULL,4,NULL,NULL,NULL,NULL,NULL,450.00,600.00,NULL,0,20,'Nestlé Milo chocolate malt energy drink powder, 500g tin. Rich in vitamins and minerals.','https://images.unsplash.com/photo-1571506165871-ee72a35bc9d4?w=600&h=600&fit=crop','active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','grocery_store'),
(5,'USB-C Charging Cable 1m','GEN-USBC-1M','9999999000001',NULL,1,NULL,NULL,NULL,5,NULL,NULL,NULL,NULL,NULL,150.00,350.00,NULL,0,20,'Universal USB-C charging cable, 1 meter. Compatible with all USB-C devices. Braided nylon for durability.','https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&h=600&fit=crop','active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','electronics'),
(6,'T-Shirt (White, L)','CLO-TS-WHT-L','9999999000002',NULL,2,NULL,NULL,NULL,5,NULL,NULL,NULL,NULL,NULL,400.00,850.00,NULL,0,10,'Premium 100% cotton white t-shirt. Comfortable fit for everyday wear. Size: Large.','https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop','active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','garments'),
(7,'Single Line Copy','STN-001',NULL,NULL,7,1,NULL,'100',NULL,NULL,NULL,NULL,NULL,NULL,42.00,60.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(8,'Double Line Copy','STN-002',NULL,NULL,7,1,NULL,'100',NULL,NULL,NULL,NULL,NULL,NULL,42.00,60.00,NULL,3,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(9,'Four Line Copy','STN-003',NULL,NULL,7,1,NULL,'100',NULL,NULL,NULL,NULL,NULL,NULL,49.00,70.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(10,'Square Copy','STN-004',NULL,NULL,7,1,NULL,'100',NULL,NULL,NULL,NULL,NULL,NULL,49.00,70.00,NULL,1,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(11,'Practical Copy','STN-005',NULL,NULL,7,1,NULL,'120',NULL,NULL,NULL,NULL,NULL,NULL,63.00,90.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(12,'Student Register','STN-006',NULL,NULL,7,2,NULL,'200',NULL,NULL,NULL,NULL,NULL,NULL,175.00,250.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(13,'Attendance Register','STN-007',NULL,NULL,7,2,NULL,'300',NULL,NULL,NULL,NULL,NULL,NULL,210.00,300.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(14,'Office Register','STN-008',NULL,NULL,7,2,NULL,'400',NULL,NULL,NULL,NULL,NULL,NULL,245.00,350.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(15,'Cash Register','STN-009',NULL,NULL,7,2,NULL,'400',NULL,NULL,NULL,NULL,NULL,NULL,245.00,350.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(16,'Stock Register','STN-010',NULL,NULL,7,2,NULL,'500',NULL,NULL,NULL,NULL,NULL,NULL,280.00,400.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(17,'Student Diary 50 Pages','STN-011',NULL,NULL,7,3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,56.00,80.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(18,'Student Diary 70 Pages','STN-012',NULL,NULL,7,3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,70.00,100.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(19,'Student Diary 100 Pages','STN-013',NULL,NULL,7,3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,91.00,130.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(20,'White Chart','STN-014',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,21.00,30.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(21,'Black Chart','STN-015',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,25.00,35.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(22,'Green Chart','STN-016',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,25.00,35.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(23,'Blue Chart','STN-017',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,25.00,35.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(24,'Yellow Chart','STN-018',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,25.00,35.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(25,'Pink Chart','STN-019',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,25.00,35.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(26,'Red Chart','STN-020',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,25.00,35.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(27,'Golden Chart','STN-021',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,35.00,50.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(28,'Silver Chart','STN-022',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,35.00,50.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(29,'Glitter Chart','STN-023',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,42.00,60.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(30,'Fluorescent Chart','STN-024',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,35.00,50.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(31,'Card Sheet','STN-025',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,28.00,40.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(32,'Handmade Sheet','STN-026',NULL,NULL,7,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,49.00,70.00,NULL,0,10,NULL,NULL,'active','SHEET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(33,'Ball Pen','STN-027',NULL,NULL,7,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,14.00,20.00,NULL,3,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(34,'Gel Pen','STN-028',NULL,NULL,7,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,28.00,40.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(35,'Ink Pen','STN-029',NULL,NULL,7,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,84.00,120.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(36,'Lead Pen','STN-030',NULL,NULL,7,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,35.00,50.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(37,'Pointer','STN-031',NULL,NULL,7,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,42.00,60.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(38,'Board Marker','STN-032',NULL,NULL,7,6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,42.00,60.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(39,'White Board Marker','STN-033',NULL,NULL,7,6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,42.00,60.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(40,'Permanent Marker','STN-034',NULL,NULL,7,6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,49.00,70.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(41,'CD Marker','STN-035',NULL,NULL,7,6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,56.00,80.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(42,'HB Pencil','STN-036',NULL,NULL,7,7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,11.00,15.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(43,'2B Pencil','STN-037',NULL,NULL,7,7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,14.00,20.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(44,'Drawing Pencil','STN-038',NULL,NULL,7,7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,21.00,30.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(45,'Exam Pencil','STN-039',NULL,NULL,7,7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,14.00,20.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(46,'Mechanical Pencil','STN-040',NULL,NULL,7,7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,56.00,80.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(47,'Pencil Colors','STN-041',NULL,NULL,7,8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,105.00,150.00,NULL,0,10,NULL,NULL,'active','BOX',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(48,'Crayons','STN-042',NULL,NULL,7,8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,84.00,120.00,NULL,0,10,NULL,NULL,'active','BOX',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(49,'Oil Pastels','STN-043',NULL,NULL,7,8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,126.00,180.00,NULL,0,10,NULL,NULL,'active','BOX',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(50,'Water Colors','STN-044',NULL,NULL,7,8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,140.00,200.00,NULL,0,10,NULL,NULL,'active','BOX',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(51,'Poster Colors','STN-045',NULL,NULL,7,8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,175.00,250.00,NULL,0,10,NULL,NULL,'active','BOX',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(52,'Acrylic Colors','STN-046',NULL,NULL,7,8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,245.00,350.00,NULL,0,10,NULL,NULL,'active','BOX',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(53,'Paint Brushes','STN-047',NULL,NULL,7,8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,70.00,100.00,NULL,0,10,NULL,NULL,'active','SET',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(54,'Geometry Box','STN-048',NULL,NULL,7,9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,140.00,200.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(55,'Compass','STN-049',NULL,NULL,7,9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,56.00,80.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(56,'Divider','STN-050',NULL,NULL,7,9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,49.00,70.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(57,'Protractor','STN-051',NULL,NULL,7,9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,21.00,30.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(58,'Set Square','STN-052',NULL,NULL,7,9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,28.00,40.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(59,'Scale','STN-053',NULL,NULL,7,9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,18.00,25.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(60,'School Bag','STN-054',NULL,NULL,7,10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,840.00,1200.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(61,'Pencil Box','STN-055',NULL,NULL,7,10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,105.00,150.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(62,'Water Bottle','STN-056',NULL,NULL,7,10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,210.00,300.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(63,'Lunch Box','STN-057',NULL,NULL,7,10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,280.00,400.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(64,'Book Cover','STN-058',NULL,NULL,7,10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,14.00,20.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:07:58','2026-06-07 13:24:38','stationery_store'),
(65,'English Grammar (Class 5)','BKS-001',NULL,NULL,8,NULL,NULL,NULL,10,NULL,NULL,NULL,NULL,NULL,0.00,350.00,NULL,0,8,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:14:08','2026-06-07 13:24:38','book_store'),
(66,'Mathematics Keynotes (Class 9)','BKS-002',NULL,NULL,9,NULL,NULL,NULL,7,NULL,NULL,NULL,NULL,NULL,0.00,280.00,NULL,0,10,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:14:08','2026-06-07 13:24:38','book_store'),
(67,'Urdu Qaida','BKS-003',NULL,NULL,11,NULL,NULL,NULL,6,NULL,NULL,NULL,NULL,NULL,0.00,120.00,NULL,0,15,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:14:08','2026-06-07 13:24:38','book_store'),
(68,'General Knowledge Novel','BKS-004',NULL,NULL,10,NULL,NULL,NULL,12,NULL,NULL,NULL,NULL,NULL,0.00,500.00,NULL,0,5,NULL,NULL,'active','PCS',NULL,NULL,NULL,'2026-06-07 13:14:08','2026-06-07 13:24:38','book_store');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `publisher_series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `publisher_series` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `brand_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `publisher_series` WRITE;
/*!40000 ALTER TABLE `publisher_series` DISABLE KEYS */;
INSERT INTO `publisher_series` VALUES
(1,6,'PTB Primary Series (1-5)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(2,6,'PTB Middle Series (6-8)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(3,6,'PTB Matric Series (9-10)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(4,6,'PTB Intermediate Series (11-12)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(5,7,'Afaq Keynotes (Primary)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(6,7,'Afaq Guide (Matric)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(7,7,'Afaq Solved Papers (Inter)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(8,8,'Conti English Grammar Series','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(9,8,'Conti Matric Solved Series','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(10,9,'Book Wise Guides (Primary)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(11,9,'Book Wise Matric Notes','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(12,10,'OUP New Countdown Mathematics','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(13,10,'OUP Stepping Stones (Primary)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(14,11,'Cambridge O Level Series','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(15,11,'Cambridge A Level Series','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(16,12,'Paramount Solved Papers','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(17,12,'Paramount Notes (Matric)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(18,14,'FBISE Textbooks (9-10)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(19,14,'FBISE Textbooks (11-12)','2026-06-07 13:07:58','2026-06-07 13:07:58'),
(20,15,'MM Key Notes Series','2026-06-07 13:07:58','2026-06-07 13:07:58');
/*!40000 ALTER TABLE `publisher_series` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `cost_price` decimal(12,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
INSERT INTO `purchase_items` VALUES
(1,1,8,5,42.00,'2026-06-08 09:00:22'),
(2,1,10,5,49.00,'2026-06-08 09:00:22'),
(3,1,33,5,14.00,'2026-06-08 09:00:22');
/*!40000 ALTER TABLE `purchase_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `purchase_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_return_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `return_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `cost_price` decimal(12,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `purchase_return_items` WRITE;
/*!40000 ALTER TABLE `purchase_return_items` DISABLE KEYS */;
INSERT INTO `purchase_return_items` VALUES
(1,1,8,1,42.00,'2026-06-08 09:11:39'),
(2,1,10,2,49.00,'2026-06-08 09:11:39'),
(3,1,33,1,14.00,'2026-06-08 09:11:39');
/*!40000 ALTER TABLE `purchase_return_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `purchase_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_returns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `return_number` varchar(191) NOT NULL,
  `purchase_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `return_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_returns_return_number_unique` (`return_number`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `purchase_returns` WRITE;
/*!40000 ALTER TABLE `purchase_returns` DISABLE KEYS */;
INSERT INTO `purchase_returns` VALUES
(1,'PR-1780909899341',1,3,154.00,NULL,'other','2026-06-08 09:11:39');
/*!40000 ALTER TABLE `purchase_returns` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_number` varchar(191) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `due_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_by_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchases_purchase_number_unique` (`purchase_number`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
INSERT INTO `purchases` VALUES
(1,'PO-1780909222109',3,'received',525.00,25.00,500.00,NULL,1,'2026-06-08 09:00:22','2026-06-08 09:00:22');
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
INSERT INTO `sale_items` VALUES
(1,1,8,1,60.00,3.00,'2026-06-08 09:01:11'),
(2,1,10,1,70.00,0.00,'2026-06-08 09:01:11'),
(3,1,33,1,20.00,0.00,'2026-06-08 09:01:11'),
(4,2,8,1,57.00,0.00,'2026-06-08 09:04:35'),
(5,3,8,1,60.00,0.00,'2026-06-08 11:44:19'),
(6,3,10,1,70.00,0.00,'2026-06-08 11:44:19');
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(191) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'cash',
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `due_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `is_return` tinyint(1) NOT NULL DEFAULT 0,
  `return_reason` text DEFAULT NULL,
  `original_sale_id` int(11) DEFAULT NULL,
  `created_by_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_invoice_number_unique` (`invoice_number`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
INSERT INTO `sales` VALUES
(1,'INV-1780909271292',1,'cash','cash',147.00,0.00,0.00,147.00,27.00,120.00,0,NULL,NULL,1,'2026-06-08 09:01:11','2026-06-08 09:01:11'),
(2,'RET-1780909475380',1,'return','cash',57.00,0.00,0.00,57.00,57.00,0.00,1,'other',1,1,'2026-06-08 09:04:35','2026-06-08 09:04:35'),
(3,'INV-1780919059026',NULL,'cash','cash',130.00,0.00,0.00,130.00,130.00,0.00,0,NULL,NULL,1,'2026-06-08 11:44:19','2026-06-08 11:44:19');
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_name` varchar(255) NOT NULL DEFAULT 'My Store',
  `store_phone` varchar(50) DEFAULT NULL,
  `store_email` varchar(255) DEFAULT NULL,
  `store_address` text DEFAULT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'PKR',
  `tax_rate` varchar(50) NOT NULL DEFAULT '0',
  `invoice_prefix` varchar(50) NOT NULL DEFAULT 'INV',
  `logo_url` text DEFAULT NULL,
  `favicon_url` text DEFAULT NULL,
  `dark_mode` tinyint(1) NOT NULL DEFAULT 0,
  `company_name` varchar(255) DEFAULT NULL,
  `owner_name` varchar(255) DEFAULT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `whatsapp_number` varchar(50) DEFAULT NULL,
  `stamp_url` text DEFAULT NULL,
  `signature_url` text DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `bank_account_title` varchar(255) DEFAULT NULL,
  `bank_account` varchar(100) DEFAULT NULL,
  `bank_iban` varchar(100) DEFAULT NULL,
  `bank_branch_code` varchar(50) DEFAULT NULL,
  `jazzcash_number` varchar(50) DEFAULT NULL,
  `easypaisa_number` varchar(50) DEFAULT NULL,
  `qr_code_url` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES
(1,'Tech Mentor ERP & POS','+92-300-0000000','admin@smartretail.com','123 Main Street, Karachi, Pakistan','PKR','0','INV',NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-07 13:07:58');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `subcategories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `subcategories` WRITE;
/*!40000 ALTER TABLE `subcategories` DISABLE KEYS */;
INSERT INTO `subcategories` VALUES
(1,'Copies',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(2,'Registers',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(3,'Student Diaries',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(4,'Chart Papers',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(5,'Pens',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(6,'Markers',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(7,'Pencils',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(8,'Colors & Art Items',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(9,'Geometry Items',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(10,'School Accessories',7,NULL,'2026-06-07 13:07:58','2026-06-07 13:07:58');
/*!40000 ALTER TABLE `subcategories` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `supplier_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL,
  `account` varchar(20) NOT NULL,
  `txn_type` varchar(30) NOT NULL,
  `direction` varchar(10) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `reference_no` varchar(50) NOT NULL,
  `bank_ref` varchar(191) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `txn_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `supplier_txn_supplier_idx` (`supplier_id`),
  KEY `supplier_txn_date_idx` (`txn_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `supplier_transactions` WRITE;
/*!40000 ALTER TABLE `supplier_transactions` DISABLE KEYS */;
INSERT INTO `supplier_transactions` VALUES
(1,3,'payable','payment_made','credit',100.00,'cash','PAY-000001',NULL,NULL,'2026-06-08 09:11:58',1,'2026-06-08 09:11:58');
/*!40000 ALTER TABLE `supplier_transactions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `advance_balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `advance_paid_balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES
(1,'Tech Distributors Ltd','+92-21-3456789','info@techdist.pk','Industrial Area, SITE, Karachi','Tech Distributors Ltd',0.00,'2026-06-07 13:07:58','2026-06-07 13:07:58',0.00,0.00),
(2,'Fashion Wholesale Hub','+92-21-5551234','orders@fashionhub.pk','Cloth Market, Jodia Bazar, Karachi','Fashion Wholesale Hub',0.00,'2026-06-07 13:07:58','2026-06-07 13:07:58',0.00,0.00),
(3,'Global Imports Co','+92-300-7777777','global@imports.pk','Export Processing Zone, Karachi','Global Imports Co',0.00,'2026-06-07 13:07:58','2026-06-07 13:07:58',0.00,0.00);
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `units_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
INSERT INTO `units` VALUES
(1,'PCS','2026-06-07 13:14:08'),
(2,'SET','2026-06-07 13:14:08'),
(3,'DOZEN','2026-06-07 13:14:08');
/*!40000 ALTER TABLE `units` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'cashier',
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `branch_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'admin','$2b$10$pAtG94WtaJ0LhVn.h1HLI.CXayF0E1bmmrsZjFP8V9x386vcx/BjK','System Administrator','admin@smartretail.com','admin','active',1,'2026-06-07 13:07:58','2026-06-07 13:07:58'),
(2,'manager','$2b$10$kzt3cMWgCdsJH1Q6/jDy7ugG6tw.HOyjd0UF2OHdGlszDAcJdifvW','Store Manager','manager@smartretail.com','manager','active',1,'2026-06-07 13:07:58','2026-06-07 13:07:58');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `whatsapp_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `automation_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `provider` varchar(50) NOT NULL DEFAULT 'wasms',
  `meta_access_token` text DEFAULT NULL,
  `meta_phone_number_id` varchar(100) DEFAULT NULL,
  `meta_api_version` varchar(20) NOT NULL DEFAULT 'v22.0',
  `wasms_api_key` varchar(255) DEFAULT NULL,
  `wasms_whatsapp_id` varchar(100) DEFAULT NULL,
  `custom_api_url` text DEFAULT NULL,
  `custom_api_method` varchar(10) NOT NULL DEFAULT 'POST',
  `custom_auth_header` text DEFAULT NULL,
  `custom_content_type` varchar(100) NOT NULL DEFAULT 'application/json',
  `custom_body_template` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `default_language` varchar(5) NOT NULL DEFAULT 'en',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `whatsapp_config` WRITE;
/*!40000 ALTER TABLE `whatsapp_config` DISABLE KEYS */;
INSERT INTO `whatsapp_config` VALUES
(1,0,'wasms',NULL,NULL,'v22.0',NULL,NULL,NULL,'POST',NULL,'application/json','{\"to\":\"{{to}}\",\"message\":\"{{message}}\"}','2026-06-07 13:07:58','en');
/*!40000 ALTER TABLE `whatsapp_config` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `whatsapp_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(20) NOT NULL DEFAULT 'manual',
  `entity_id` int(11) DEFAULT NULL,
  `recipient_name` varchar(255) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  `trigger` varchar(100) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'sent',
  `error` text DEFAULT NULL,
  `provider` varchar(50) DEFAULT NULL,
  `created_by_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `whatsapp_log_created_idx` (`created_at`),
  KEY `whatsapp_log_entity_idx` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `whatsapp_logs` WRITE;
/*!40000 ALTER TABLE `whatsapp_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_logs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `whatsapp_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `trigger` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `language` varchar(5) NOT NULL DEFAULT 'en',
  `business_type` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `whatsapp_templates` WRITE;
/*!40000 ALTER TABLE `whatsapp_templates` DISABLE KEYS */;
INSERT INTO `whatsapp_templates` VALUES
(1,'Sales Invoice','sales_invoice','Dear {customer_name},\n\nThank you for shopping with {company_name}.\n\nInvoice #: {invoice_no}\nAmount: {amount}\nDate: {date}\n\nWe appreciate your business!\n\nRegards,\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(2,'Counter Sale Invoice','counter_sale_invoice','Thank you for your purchase!\n\nInvoice #: {invoice_no}\nAmount: {amount}\nDate: {date} | Time: {time}\n\n{company_name}\n{branch_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(3,'Credit Sale Invoice','credit_sale_invoice','Dear {customer_name},\n\nYour credit sale has been recorded.\n\nInvoice #: {invoice_no}\nTotal: {amount}\nDue Amount: {due_amount}\n\nPlease ensure payment by the due date.\n\nRegards,\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(4,'Payment Received (Sales)','payment_received_sales','Dear {customer_name},\n\nWe have received your payment of {amount} against Invoice #{invoice_no}.\n\nRemaining Balance: {due_amount}\nDate: {date}\n\nThank you!\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(5,'Due Payment Reminder','due_payment_reminder','Dear {customer_name},\n\nThis is a friendly reminder that you have an outstanding balance of {due_amount} on your account.\n\nInvoice #: {invoice_no}\nDate: {date}\n\nPlease make payment at your earliest convenience.\n\nRegards,\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(6,'Sales Return','sales_return','Dear {customer_name},\n\nYour return has been processed successfully.\n\nReturn Invoice #: {invoice_no}\nRefund Amount: {amount}\nDate: {date}\n\nWe hope to serve you again.\n\nRegards,\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(7,'Order Confirmation','order_confirmed','Dear {customer_name},\n\nYour order has been confirmed!\n\nOrder #: {order_no}\nAmount: {amount}\nDate: {date}\n\nWe will notify you when it is ready.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(8,'Order Approved','order_approved','Dear {customer_name},\n\nGreat news! Your order #{order_no} has been approved and is now being processed.\n\nAmount: {amount}\nDate: {date}\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(9,'Order Processing','order_processing','Dear {customer_name},\n\nYour order #{order_no} is currently being processed and prepared.\n\nEstimated completion: {date}\n\nWe will keep you updated.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(10,'Order Packed','order_packed','Dear {customer_name},\n\nYour order #{order_no} has been packed and is ready for dispatch.\n\nAmount: {amount}\n\nYou will receive another notification when it is out for delivery.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(11,'Out For Delivery','order_out_for_delivery','Dear {customer_name},\n\nYour order #{order_no} is out for delivery!\n\nDriver: {driver_name}\nRoute: {route_name}\n\nPlease be available to receive your order.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(12,'Order Delivered','order_delivered','Dear {customer_name},\n\nYour order #{order_no} has been delivered successfully!\n\nAmount: {amount}\nDate: {date}\n\nThank you for choosing {company_name}. We hope to serve you again!',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(13,'Order Cancelled','order_cancelled','Dear {customer_name},\n\nWe regret to inform you that your order #{order_no} has been cancelled.\n\nIf you have any questions, please contact us.\n\nSorry for the inconvenience.\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(14,'Order Returned','order_returned','Dear {customer_name},\n\nYour order return #{order_no} has been received.\n\nRefund Amount: {amount}\nDate: {date}\n\nThe refund will be processed shortly.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(15,'Customer Registration','customer_registered','Welcome to {company_name}!\n\nDear {customer_name},\n\nYour customer account has been created successfully.\n\nDate: {date}\n\nThank you for joining us. We look forward to serving you!\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(16,'Welcome Message','customer_welcome','Welcome aboard, {customer_name}! 🎉\n\nWe are thrilled to have you as part of the {company_name} family.\n\nEnjoy exclusive deals, fast delivery, and great products.\n\nHappy Shopping!\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(17,'Birthday Wish','customer_birthday','🎂 Happy Birthday, {customer_name}!\n\nWishing you a wonderful day filled with joy and happiness.\n\nAs a birthday gift, enjoy a special discount on your next purchase!\n\nWith love,\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(18,'Loyalty Reward','customer_loyalty','Dear {customer_name},\n\nCongratulations! You have earned a loyalty reward from {company_name}.\n\nYour reward is ready to use on your next purchase.\n\nDate: {date}\n\nThank you for your continued support!\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(19,'Promotional Offer','customer_promo','🎉 Special Offer for {customer_name}!\n\nExclusive promotion from {company_name}:\n\n• {product_name}\n• Limited time offer\n• Date: {date}\n\nHurry! Don\'t miss out.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(20,'New Product Announcement','customer_new_product','📢 New Arrival at {company_name}!\n\nDear {customer_name},\n\nWe are excited to announce: {product_name}\n\nBe the first to get it!\n\nVisit us at {branch_name} today.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(21,'Purchase Order Sent','purchase_order_sent','Dear {supplier_name},\n\nA new Purchase Order has been sent to you.\n\nPO #: {invoice_no}\nAmount: {amount}\nDate: {date}\n\nPlease confirm receipt and provide delivery timeline.\n\nRegards,\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(22,'Purchase Received','purchase_received','Dear {supplier_name},\n\nWe are pleased to confirm receipt of goods for PO #{invoice_no}.\n\nAmount: {amount}\nDate: {date}\n\nThank you for your prompt delivery.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(23,'Purchase Return','purchase_return','Dear {supplier_name},\n\nPlease be informed that we are returning the following goods.\n\nReturn Ref #: {invoice_no}\nAmount: {amount}\nDate: {date}\n\nKindly process the credit/refund at your earliest.\n\nRegards,\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(24,'Supplier Registration','supplier_registered','Dear {supplier_name},\n\nWelcome to {company_name}\'s supplier network!\n\nYour supplier account has been created successfully.\n\nDate: {date}\n\nWe look forward to a long and fruitful partnership.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(25,'Supplier Payment Confirmation','supplier_payment','Dear {supplier_name},\n\nWe confirm that a payment of {amount} has been processed to your account.\n\nReference #: {invoice_no}\nDate: {date}\nPayment Method: {payment_method}\n\nThank you.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(26,'Supplier Outstanding Reminder','supplier_outstanding','Dear {supplier_name},\n\nThis is a reminder regarding an outstanding balance of {due_amount}.\n\nReference #: {invoice_no}\nDate: {date}\n\nWe will process the payment soon. Thank you for your patience.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(27,'Employee Account Created','employee_account_created','Dear {employee_name},\n\nYour employee account at {company_name} has been created.\n\nBranch: {branch_name}\nDate: {date}\n\nPlease contact your manager for login credentials.\n\nWelcome to the team!\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(28,'Employee Login Credentials','employee_credentials','Dear {employee_name},\n\nYour login credentials for {company_name} ERP system:\n\nBranch: {branch_name}\nDate: {date}\n\nPlease log in and change your password immediately.\n\nFor support, contact your administrator.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(29,'Salary Notification','employee_salary','Dear {employee_name},\n\nYour salary of {amount} has been processed for {date}.\n\nPayment Method: {payment_method}\n\nFor any queries, please contact HR.\n\nRegards,\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(30,'Attendance Notification','employee_attendance','Dear {employee_name},\n\nYour attendance has been recorded.\n\nDate: {date}\nTime: {time}\nBranch: {branch_name}\n\nThank you.\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(31,'Task Assignment','employee_task','Dear {employee_name},\n\nA new task has been assigned to you.\n\nDate: {date}\nBranch: {branch_name}\n\nPlease check the system for full task details.\n\nRegards,\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(32,'Delivery Assignment','employee_delivery','Dear {employee_name},\n\nYou have been assigned a delivery task.\n\nRoute: {route_name}\nDate: {date}\nTime: {time}\n\nPlease check the delivery app for full details.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(33,'Route Assigned','delivery_route_assigned','Dear {driver_name},\n\nA new delivery route has been assigned to you.\n\nRoute: {route_name}\nDate: {date}\nTime: {time}\n\nPlease be ready at the scheduled time.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(34,'Delivery Assigned','delivery_assigned','Dear {customer_name},\n\nYour order #{order_no} has been assigned to a delivery agent.\n\nDriver: {driver_name}\nExpected Delivery: {date}\n\nYou will be notified once delivered.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(35,'Delivery Completed','delivery_completed','Dear {customer_name},\n\nYour order #{order_no} has been delivered successfully!\n\nDriver: {driver_name}\nDate: {date} | Time: {time}\n\nThank you for choosing {company_name}!',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(36,'Failed Delivery','delivery_failed','Dear {customer_name},\n\nWe were unable to deliver your order #{order_no}.\n\nDate: {date}\n\nOur team will contact you to reschedule.\n\nSorry for the inconvenience.\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(37,'Cash Collection Reminder','delivery_cash_reminder','Dear {driver_name},\n\nPlease remember to submit the cash collection for today.\n\nAmount: {amount}\nDate: {date}\nRoute: {route_name}\n\nSubmit before end of shift.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(38,'Cash Submission Confirmed','delivery_cash_submitted','Dear {driver_name},\n\nYour cash submission of {amount} has been received and confirmed.\n\nDate: {date} | Time: {time}\nRoute: {route_name}\n\nThank you.\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(39,'Payment Received (Accounts)','payment_received','Dear {customer_name},\n\nPayment of {amount} has been received.\n\nRef #: {invoice_no}\nDate: {date}\nMethod: {payment_method}\n\nThank you for your timely payment.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(40,'Payment Confirmation','payment_confirmed','Dear {customer_name},\n\nThis confirms that your payment of {amount} has been successfully processed.\n\nTransaction Ref #: {invoice_no}\nDate: {date}\n\nKeep this for your records.\n\n{company_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(41,'Expense Approval','expense_approved','Dear {employee_name},\n\nYour expense request of {amount} has been approved.\n\nDate: {date}\nApproved by: {company_name} Management\n\nThe amount will be processed shortly.',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(42,'Cash Collection Report','cash_report','Cash Collection Report\n\nBranch: {branch_name}\nDate: {date}\nTotal Collected: {amount}\nDriver: {driver_name}\n\nReport generated by {company_name}.',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(43,'Password Reset','password_reset','Dear {employee_name},\n\nA password reset has been requested for your {company_name} account.\n\nDate: {date} | Time: {time}\n\nIf you did not request this, please contact your administrator immediately.',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(44,'Login Verification','login_verification','Dear {employee_name},\n\nA login was detected on your {company_name} account.\n\nDate: {date} | Time: {time}\n\nIf this was not you, please contact support immediately.',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(45,'Security Alert','security_alert','⚠️ Security Alert - {company_name}\n\nDear {employee_name},\n\nA security event has been detected on your account.\n\nDate: {date} | Time: {time}\n\nPlease contact your system administrator immediately.',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(46,'Backup Completed','backup_completed','System Notification - {company_name}\n\nDatabase backup completed successfully.\n\nDate: {date} | Time: {time}\nBranch: {branch_name}\n\nAll data is safe and secured.',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(47,'System Notification','system_notification','System Notification from {company_name}\n\nDear {employee_name},\n\nDate: {date} | Time: {time}\n\nPlease log in to the system for more details.',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(48,'Customer Payment Received','payment_received','Dear {customer_name},\n\nWe have received your payment of {amount}.\nReference: {ledger_reference}\nOutstanding Balance: {balance}\nDate: {date}\n\nThank you!\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(49,'Customer Payment Received (Urdu)','payment_received','محترم {customer_name}،\n\nہمیں آپ کی {amount} کی ادائیگی موصول ہوگئی ہے۔\nحوالہ: {ledger_reference}\nبقایا رقم: {balance}\nتاریخ: {date}\n\nشکریہ!\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(50,'Customer Advance Received','advance_deposit','Dear {customer_name},\n\nWe have received an advance of {amount}.\nReference: {ledger_reference}\nAdvance Balance: {advance_balance}\nDate: {date}\n\nThank you!\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(51,'Customer Advance Received (Urdu)','advance_deposit','محترم {customer_name}،\n\nہمیں {amount} کی پیشگی رقم موصول ہوئی ہے۔\nحوالہ: {ledger_reference}\nپیشگی بیلنس: {advance_balance}\nتاریخ: {date}\n\nشکریہ!\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(52,'Customer Refund','advance_paid','Dear {customer_name},\n\nA refund of {amount} has been processed.\nReference: {ledger_reference}\nRemaining Advance: {advance_balance}\nDate: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(53,'Customer Refund (Urdu)','advance_paid','محترم {customer_name}،\n\n{amount} کی رقم واپس کر دی گئی ہے۔\nحوالہ: {ledger_reference}\nباقی پیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(54,'Customer Outstanding Reminder','customer_outstanding','Dear {customer_name},\n\nThis is a reminder that your outstanding balance is {balance}.\nDate: {date}\n\nPlease clear your dues at your earliest convenience.\n\nRegards,\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(55,'Customer Outstanding Reminder (Urdu)','customer_outstanding','محترم {customer_name}،\n\nیہ یاد دہانی ہے کہ آپ کی بقایا رقم {balance} ہے۔\nتاریخ: {date}\n\nبراہ کرم اپنی واجب الادا رقم جلد ادا کریں۔\n\nشکریہ،\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(56,'Customer Overdue Notice','customer_overdue','Dear {customer_name},\n\nYour account has an OVERDUE balance of {balance}.\nDate: {date}\n\nKindly settle the amount immediately to avoid service disruption.\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(57,'Customer Overdue Notice (Urdu)','customer_overdue','محترم {customer_name}،\n\nآپ کے کھاتے میں {balance} کی واجب الادا (اوور ڈیو) رقم ہے۔\nتاریخ: {date}\n\nبراہ کرم فوری ادائیگی کریں۔\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(58,'Customer Statement','customer_statement','Dear {customer_name},\n\nPlease find your account statement from {business_name}.\nClosing Balance: {balance}\nAdvance: {advance_balance}\nDate: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(59,'Customer Statement (Urdu)','customer_statement','محترم {customer_name}،\n\n{business_name} کی جانب سے آپ کے کھاتے کا گوشوارہ۔\nاختتامی بیلنس: {balance}\nپیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(60,'Customer Summary','customer_summary','Dear {customer_name},\n\nAccount Summary\nOutstanding: {balance}\nAdvance: {advance_balance}\nDate: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(61,'Customer Summary (Urdu)','customer_summary','محترم {customer_name}،\n\nکھاتے کا خلاصہ\nبقایا: {balance}\nپیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(62,'Supplier Payment Made','supplier_payment_made','Dear {supplier_name},\n\nWe have made a payment of {amount} to your account.\nReference: {ledger_reference}\nOutstanding Payable: {balance}\nDate: {date}\n\nThank you,\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(63,'Supplier Payment Made (Urdu)','supplier_payment_made','محترم {supplier_name}،\n\nہم نے آپ کے کھاتے میں {amount} کی ادائیگی کی ہے۔\nحوالہ: {ledger_reference}\nبقایا واجب الادا: {balance}\nتاریخ: {date}\n\nشکریہ،\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(64,'Supplier Advance Paid','supplier_advance_paid','Dear {supplier_name},\n\nWe have paid you an advance of {amount}.\nReference: {ledger_reference}\nAdvance Balance: {advance_balance}\nDate: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(65,'Supplier Advance Paid (Urdu)','supplier_advance_paid','محترم {supplier_name}،\n\nہم نے آپ کو {amount} کی پیشگی رقم ادا کی ہے۔\nحوالہ: {ledger_reference}\nپیشگی بیلنس: {advance_balance}\nتاریخ: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(66,'Supplier Refund','supplier_refund','Dear {supplier_name},\n\nWe acknowledge a refund of {amount} received from you.\nReference: {ledger_reference}\nDate: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(67,'Supplier Refund (Urdu)','supplier_refund','محترم {supplier_name}،\n\nہمیں آپ کی جانب سے {amount} کی واپسی موصول ہوئی ہے۔\nحوالہ: {ledger_reference}\nتاریخ: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(68,'Supplier Outstanding Reminder','supplier_outstanding','Dear {supplier_name},\n\nOur outstanding payable to you is {balance}.\nDate: {date}\n\nWe will process the payment soon. Thank you for your patience.\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(69,'Supplier Outstanding Reminder (Urdu)','supplier_outstanding','محترم {supplier_name}،\n\nآپ کو ہماری واجب الادا رقم {balance} ہے۔\nتاریخ: {date}\n\nہم جلد ادائیگی کر دیں گے۔ شکریہ۔\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(70,'Supplier Overdue Notice','supplier_overdue','Dear {supplier_name},\n\nThis is regarding an overdue payable of {balance} on our account with you.\nDate: {date}\n\nWe are arranging settlement at the earliest.\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(71,'Supplier Overdue Notice (Urdu)','supplier_overdue','محترم {supplier_name}،\n\nیہ آپ کے ساتھ ہمارے کھاتے میں {balance} کی واجب الادا رقم سے متعلق ہے۔\nتاریخ: {date}\n\nہم جلد بندوبست کر رہے ہیں۔\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(72,'Supplier Statement','supplier_statement','Dear {supplier_name},\n\nPlease find your account statement from {business_name}.\nClosing Payable: {balance}\nAdvance: {advance_balance}\nDate: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(73,'Supplier Statement (Urdu)','supplier_statement','محترم {supplier_name}،\n\n{business_name} کی جانب سے آپ کے کھاتے کا گوشوارہ۔\nاختتامی واجب الادا: {balance}\nپیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL),
(74,'Supplier Summary','supplier_summary','Dear {supplier_name},\n\nAccount Summary\nPayable: {balance}\nAdvance: {advance_balance}\nDate: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','en',NULL),
(75,'Supplier Summary (Urdu)','supplier_summary','محترم {supplier_name}،\n\nکھاتے کا خلاصہ\nواجب الادا: {balance}\nپیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}',1,'2026-06-08 07:20:54','2026-06-08 07:20:54','ur',NULL);
/*!40000 ALTER TABLE `whatsapp_templates` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

