import { mysqlTable, text, int, varchar, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cashCollectionsTable = mysqlTable("cash_collections", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").notNull(),
  orderId: int("order_id"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("collected"), // collected | submitted
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending | settled
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCashCollectionSchema = createInsertSchema(cashCollectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCashCollection = z.infer<typeof insertCashCollectionSchema>;
export type CashCollection = typeof cashCollectionsTable.$inferSelect;
