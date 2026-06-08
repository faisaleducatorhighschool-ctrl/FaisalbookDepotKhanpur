import { mysqlTable, text, int, varchar, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ledgerEntriesTable = mysqlTable("ledger_entries", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // customer | supplier
  entityId: int("entity_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // debit | credit
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  referenceId: int("reference_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntriesTable).omit({ id: true, createdAt: true });
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntriesTable.$inferSelect;
