import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cashCollectionsTable = pgTable("cash_collections", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  orderId: integer("order_id"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type").notNull().default("collected"), // collected | submitted
  status: text("status").notNull().default("pending"), // pending | settled
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCashCollectionSchema = createInsertSchema(cashCollectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCashCollection = z.infer<typeof insertCashCollectionSchema>;
export type CashCollection = typeof cashCollectionsTable.$inferSelect;
