import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode"),
  isbn: text("isbn"),
  categoryId: integer("category_id"),
  subCategoryId: integer("sub_category_id"),
  branchId: integer("branch_id"),
  callNumber: text("call_number"),
  brandId: integer("brand_id"),
  seriesId: integer("series_id"),
  classId: integer("class_id"),
  subjectId: integer("subject_id"),
  author: text("author"),
  edition: text("edition"),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
  salePrice: numeric("sale_price", { precision: 12, scale: 2 }).notNull().default("0"),
  discountPrice: numeric("discount_price", { precision: 12, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  lowStockLimit: integer("low_stock_limit").notNull().default(10),
  description: text("description"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("active"),
  unit: text("unit").notNull().default("PCS"),
  batchNumber: text("batch_number"),
  mfgDate: text("mfg_date"),
  expiryDate: text("expiry_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
