import { mysqlTable, text, int, varchar, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryRoutesTable = mysqlTable("delivery_routes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  area: varchar("area", { length: 255 }).notNull(),
  vehicle: varchar("vehicle", { length: 255 }),
  employeeId: int("employee_id"),
  deliveryDate: varchar("delivery_date", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const deliveryAssignmentsTable = mysqlTable("delivery_assignments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  employeeId: int("employee_id").notNull(),
  routeId: int("route_id"),
  status: varchar("status", { length: 50 }).notNull().default("assigned"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeliveryRouteSchema = createInsertSchema(deliveryRoutesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliveryAssignmentSchema = createInsertSchema(deliveryAssignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeliveryRoute = z.infer<typeof insertDeliveryRouteSchema>;
export type InsertDeliveryAssignment = z.infer<typeof insertDeliveryAssignmentSchema>;
export type DeliveryRoute = typeof deliveryRoutesTable.$inferSelect;
export type DeliveryAssignment = typeof deliveryAssignmentsTable.$inferSelect;
