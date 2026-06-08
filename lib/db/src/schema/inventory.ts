import { mysqlTable, text, int, varchar, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryMovementsTable = mysqlTable("inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // stock_in, stock_out, adjustment, transfer
  quantity: int("quantity").notNull(),
  notes: text("notes"),
  branchId: int("branch_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovementsTable).omit({ id: true, createdAt: true });
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
