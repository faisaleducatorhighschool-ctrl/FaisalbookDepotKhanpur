import { mysqlTable, text, int, varchar, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employeesTable = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: varchar("employee_id", { length: 191 }).notNull().unique(),
  username: varchar("username", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  cnic: varchar("cnic", { length: 50 }),
  address: text("address"),
  role: varchar("role", { length: 50 }).notNull().default("cashier"),
  salary: decimal("salary", { precision: 12, scale: 2 }).notNull().default("0"),
  joiningDate: varchar("joining_date", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  branchId: int("branch_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
