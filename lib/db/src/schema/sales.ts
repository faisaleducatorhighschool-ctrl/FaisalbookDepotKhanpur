import { mysqlTable, text, int, varchar, timestamp, decimal, boolean } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salesTable = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 191 }).notNull().unique(),
  customerId: int("customer_id"),
  type: varchar("type", { length: 50 }).notNull().default("cash"), // cash | credit
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("cash"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: decimal("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  dueAmount: decimal("due_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  isReturn: boolean("is_return").notNull().default(false),
  returnReason: text("return_reason"),
  originalSaleId: int("original_sale_id"),
  createdById: int("created_by_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const saleItemsTable = mysqlTable("sale_items", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("sale_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
