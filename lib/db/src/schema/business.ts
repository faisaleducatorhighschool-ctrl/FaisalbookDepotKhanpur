import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { jsonColumn } from "./_json";

// Multi-business platform configuration. Single row (id=1). Holds which business
// packs are active, the primary one (drives the smart dashboard), which modules
// are enabled, and which packs have already had their master data applied.
// NOTE: MySQL JSON columns cannot carry a column DEFAULT, so the singleton row
// is seeded with explicit JSON values instead of relying on a SQL default.
export const businessConfigTable = mysqlTable("business_config", {
  id: int("id").autoincrement().primaryKey(),
  activeBusinessTypes: jsonColumn<string[]>("active_business_types").notNull(),
  primaryBusinessType: varchar("primary_business_type", { length: 50 }),
  enabledModules: jsonColumn<Record<string, boolean>>("enabled_modules").notNull(),
  appliedPacks: jsonColumn<string[]>("applied_packs").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// Reference list of measurement units (master data). Loaded per business pack.
export const unitsTable = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 191 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUnitSchema = createInsertSchema(unitsTable).omit({ id: true, createdAt: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;
export type BusinessConfig = typeof businessConfigTable.$inferSelect;
