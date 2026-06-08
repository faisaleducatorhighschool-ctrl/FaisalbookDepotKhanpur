import { mysqlTable, text, int, varchar, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchaseReturnsTable = mysqlTable("purchase_returns", {
  id: int("id").autoincrement().primaryKey(),
  returnNumber: varchar("return_number", { length: 191 }).notNull().unique(),
  purchaseId: int("purchase_id"),
  supplierId: int("supplier_id"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  returnReason: text("return_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseReturnItemsTable = mysqlTable("purchase_return_items", {
  id: int("id").autoincrement().primaryKey(),
  returnId: int("return_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").notNull(),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPurchaseReturnSchema = createInsertSchema(purchaseReturnsTable).omit({ id: true, createdAt: true });
export const insertPurchaseReturnItemSchema = createInsertSchema(purchaseReturnItemsTable).omit({ id: true, createdAt: true });
export type InsertPurchaseReturn = z.infer<typeof insertPurchaseReturnSchema>;
export type PurchaseReturn = typeof purchaseReturnsTable.$inferSelect;
