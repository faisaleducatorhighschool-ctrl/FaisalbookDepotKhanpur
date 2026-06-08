import { mysqlTable, text, int, varchar, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 191 }).notNull().unique(),
  customerId: int("customer_id"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  deliveryMethod: varchar("delivery_method", { length: 50 }).notNull().default("home_delivery"),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("cash"),
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("pending"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: decimal("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  dueAmount: decimal("due_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  customerToken: varchar("customer_token", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const orderItemsTable = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
