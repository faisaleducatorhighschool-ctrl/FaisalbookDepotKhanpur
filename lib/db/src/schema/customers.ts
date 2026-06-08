import { mysqlTable, text, int, varchar, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  passwordHash: varchar("password_hash", { length: 255 }),
  wishlistItems: text("wishlist_items"),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  advanceBalance: decimal("advance_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  advancePaidBalance: decimal("advance_paid_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  totalOrders: int("total_orders").notNull().default(0),
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
