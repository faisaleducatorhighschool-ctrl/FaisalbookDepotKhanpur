CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'cashier' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"branch_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text,
	"email" text,
	"is_main" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category_id" integer NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"barcode" text,
	"isbn" text,
	"category_id" integer,
	"sub_category_id" integer,
	"branch_id" integer,
	"call_number" text,
	"brand_id" integer,
	"series_id" integer,
	"class_id" integer,
	"subject_id" integer,
	"author" text,
	"edition" text,
	"cost_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sale_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_price" numeric(12, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock_limit" integer DEFAULT 10 NOT NULL,
	"description" text,
	"image_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"unit" text DEFAULT 'PCS' NOT NULL,
	"batch_number" text,
	"mfg_date" text,
	"expiry_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text,
	"branch_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"password_hash" text,
	"wishlist_items" text,
	"credit_limit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"company" text,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"reference_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivery_method" text DEFAULT 'home_delivery' NOT NULL,
	"payment_method" text DEFAULT 'cash' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"due_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"customer_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_number" text NOT NULL,
	"supplier_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"due_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_purchase_number_unique" UNIQUE("purchase_number")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"username" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"cnic" text,
	"address" text,
	"role" text DEFAULT 'cashier' NOT NULL,
	"salary" numeric(12, 2) DEFAULT '0' NOT NULL,
	"joining_date" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"branch_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"route_id" integer,
	"status" text DEFAULT 'assigned' NOT NULL,
	"delivered_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"vehicle" text,
	"employee_id" integer,
	"delivery_date" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"order_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"type" text DEFAULT 'collected' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" text NOT NULL,
	"date" text NOT NULL,
	"notes" text,
	"branch_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"customer_id" integer,
	"type" text DEFAULT 'cash' NOT NULL,
	"payment_method" text DEFAULT 'cash' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"due_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_return" boolean DEFAULT false NOT NULL,
	"return_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"reference_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_name" text DEFAULT 'My Store' NOT NULL,
	"store_phone" text,
	"store_email" text,
	"store_address" text,
	"currency" text DEFAULT 'PKR' NOT NULL,
	"tax_rate" text DEFAULT '0' NOT NULL,
	"invoice_prefix" text DEFAULT 'INV' NOT NULL,
	"logo_url" text,
	"favicon_url" text,
	"dark_mode" boolean DEFAULT false NOT NULL,
	"company_name" text,
	"owner_name" text,
	"branch_name" text,
	"whatsapp_number" text,
	"stamp_url" text,
	"signature_url" text,
	"bank_name" text,
	"bank_account_title" text,
	"bank_account" text,
	"bank_iban" text,
	"bank_branch_code" text,
	"jazzcash_number" text,
	"easypaisa_number" text,
	"qr_code_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"message" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_number" text NOT NULL,
	"purchase_id" integer,
	"supplier_id" integer,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"return_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_returns_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE "book_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_classes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "book_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_subjects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "publisher_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
