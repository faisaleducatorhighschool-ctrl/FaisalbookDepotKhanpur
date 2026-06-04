import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryRoutesTable = pgTable("delivery_routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  area: text("area").notNull(),
  vehicle: text("vehicle"),
  employeeId: integer("employee_id"),
  deliveryDate: text("delivery_date"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const deliveryAssignmentsTable = pgTable("delivery_assignments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  routeId: integer("route_id"),
  status: text("status").notNull().default("assigned"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeliveryRouteSchema = createInsertSchema(deliveryRoutesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliveryAssignmentSchema = createInsertSchema(deliveryAssignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeliveryRoute = z.infer<typeof insertDeliveryRouteSchema>;
export type InsertDeliveryAssignment = z.infer<typeof insertDeliveryAssignmentSchema>;
export type DeliveryRoute = typeof deliveryRoutesTable.$inferSelect;
export type DeliveryAssignment = typeof deliveryAssignmentsTable.$inferSelect;
