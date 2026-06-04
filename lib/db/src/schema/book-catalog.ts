import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const publisherSeriesTable = pgTable("publisher_series", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const bookClassesTable = pgTable("book_classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookSubjectsTable = pgTable("book_subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
