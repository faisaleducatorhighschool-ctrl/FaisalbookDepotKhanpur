import { mysqlTable, text, int, varchar, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchasesTable = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  purchaseNumber: varchar("purchase_number", { length: 191 }).notNull().unique(),
  supplierId: int("supplier_id").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  dueAmount: decimal("due_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdById: int("created_by_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const purchaseItemsTable = mysqlTable("purchase_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseId: int("purchase_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").notNull(),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseItemSchema = createInsertSchema(purchaseItemsTable).omit({ id: true, createdAt: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;
export type PurchaseItem = typeof purchaseItemsTable.$inferSelect;
