import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info | warning | success | error
  isRead: boolean("is_read").notNull().default(false),
  referenceId: integer("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const whatsappTemplatesTable = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  message: text("message").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull().default("My Store"),
  storePhone: text("store_phone"),
  storeEmail: text("store_email"),
  storeAddress: text("store_address"),
  currency: text("currency").notNull().default("PKR"),
  taxRate: text("tax_rate").notNull().default("0"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  darkMode: boolean("dark_mode").notNull().default(false),
  companyName: text("company_name"),
  ownerName: text("owner_name"),
  branchName: text("branch_name"),
  whatsappNumber: text("whatsapp_number"),
  stampUrl: text("stamp_url"),
  signatureUrl: text("signature_url"),
  bankName: text("bank_name"),
  bankAccountTitle: text("bank_account_title"),
  bankAccount: text("bank_account"),
  bankIban: text("bank_iban"),
  bankBranchCode: text("bank_branch_code"),
  jazzcashNumber: text("jazzcash_number"),
  easypaisaNumber: text("easypaisa_number"),
  qrCodeUrl: text("qr_code_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
export type WhatsappTemplate = typeof whatsappTemplatesTable.$inferSelect;
export type Settings = typeof settingsTable.$inferSelect;
