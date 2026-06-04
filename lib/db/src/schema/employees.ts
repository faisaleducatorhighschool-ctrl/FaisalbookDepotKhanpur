import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  username: text("username"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  cnic: text("cnic"),
  address: text("address"),
  role: text("role").notNull().default("cashier"),
  salary: numeric("salary", { precision: 12, scale: 2 }).notNull().default("0"),
  joiningDate: text("joining_date").notNull(),
  status: text("status").notNull().default("active"),
  branchId: integer("branch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
