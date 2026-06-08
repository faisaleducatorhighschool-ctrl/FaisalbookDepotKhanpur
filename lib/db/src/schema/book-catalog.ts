import { mysqlTable, text, int, varchar, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const publisherSeriesTable = mysqlTable("publisher_series", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brand_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const bookClassesTable = mysqlTable("book_classes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 191 }).notNull().unique(),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookSubjectsTable = mysqlTable("book_subjects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 191 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPublisherSeriesSchema = createInsertSchema(publisherSeriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPublisherSeries = z.infer<typeof insertPublisherSeriesSchema>;
export type PublisherSeries = typeof publisherSeriesTable.$inferSelect;

export const insertBookClassSchema = createInsertSchema(bookClassesTable).omit({ id: true, createdAt: true });
export type InsertBookClass = z.infer<typeof insertBookClassSchema>;
export type BookClass = typeof bookClassesTable.$inferSelect;

export const insertBookSubjectSchema = createInsertSchema(bookSubjectsTable).omit({ id: true, createdAt: true });
export type InsertBookSubject = z.infer<typeof insertBookSubjectSchema>;
export type BookSubject = typeof bookSubjectsTable.$inferSelect;
