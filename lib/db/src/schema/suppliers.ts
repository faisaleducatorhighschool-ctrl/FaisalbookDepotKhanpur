import { mysqlTable, text, int, varchar, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const suppliersTable = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  company: varchar("company", { length: 255 }),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  // Advance we have paid the supplier (a prepaid credit we hold against them) +
  // cumulative advance refunded/applied (audit). Payable stays live-derived.
  advanceBalance: decimal("advance_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  advancePaidBalance: decimal("advance_paid_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;
