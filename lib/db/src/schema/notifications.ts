import { mysqlTable, text, int, varchar, timestamp, boolean, index } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // info | warning | success | error
  isRead: boolean("is_read").notNull().default(false),
  referenceId: int("reference_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const whatsappTemplatesTable = mysqlTable("whatsapp_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  trigger: varchar("trigger", { length: 100 }).notNull(),
  message: text("message").notNull(),
  // Language variant of this template. Automation picks the variant matching the
  // gateway's defaultLanguage, falling back to any active variant for the trigger.
  language: varchar("language", { length: 5 }).notNull().default("en"), // en | ur
  // Optional business scoping (null = applies to all businesses).
  businessType: varchar("business_type", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// Append-only log of every WhatsApp message the system attempts to send, so the
// admin can audit sent/failed history, view delivery state, and resend.
export const whatsappLogsTable = mysqlTable("whatsapp_logs", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entity_type", { length: 20 }).notNull().default("manual"), // customer | supplier | manual
  entityId: int("entity_id"),
  recipientName: varchar("recipient_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  trigger: varchar("trigger", { length: 100 }),
  templateName: varchar("template_name", { length: 255 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("sent"), // sent | failed
  error: text("error"),
  provider: varchar("provider", { length: 50 }),
  createdById: int("created_by_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ([
  index("whatsapp_log_created_idx").on(t.createdAt),
  index("whatsapp_log_entity_idx").on(t.entityType, t.entityId),
]));

export const settingsTable = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("store_name", { length: 255 }).notNull().default("My Store"),
  storePhone: varchar("store_phone", { length: 50 }),
  storeEmail: varchar("store_email", { length: 255 }),
  storeAddress: text("store_address"),
  currency: varchar("currency", { length: 10 }).notNull().default("PKR"),
  taxRate: varchar("tax_rate", { length: 50 }).notNull().default("0"),
  invoicePrefix: varchar("invoice_prefix", { length: 50 }).notNull().default("INV"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  darkMode: boolean("dark_mode").notNull().default(false),
  companyName: varchar("company_name", { length: 255 }),
  ownerName: varchar("owner_name", { length: 255 }),
  branchName: varchar("branch_name", { length: 255 }),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }),
  stampUrl: text("stamp_url"),
  signatureUrl: text("signature_url"),
  bankName: varchar("bank_name", { length: 255 }),
  bankAccountTitle: varchar("bank_account_title", { length: 255 }),
  bankAccount: varchar("bank_account", { length: 100 }),
  bankIban: varchar("bank_iban", { length: 100 }),
  bankBranchCode: varchar("bank_branch_code", { length: 50 }),
  jazzcashNumber: varchar("jazzcash_number", { length: 50 }),
  easypaisaNumber: varchar("easypaisa_number", { length: 50 }),
  qrCodeUrl: text("qr_code_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// Provider-independent WhatsApp gateway configuration. Single row (id=1).
// Kept separate from settingsTable so credentials are only exposed via the
// admin-only /whatsapp/config endpoint (never leaked through GET /settings).
export const whatsappConfigTable = mysqlTable("whatsapp_config", {
  id: int("id").autoincrement().primaryKey(),
  automationEnabled: boolean("automation_enabled").notNull().default(false),
  provider: varchar("provider", { length: 50 }).notNull().default("wasms"), // meta | wasms | custom
  // Preferred language for automated template selection (en | ur).
  defaultLanguage: varchar("default_language", { length: 5 }).notNull().default("en"),
  // Meta WhatsApp Cloud API
  metaAccessToken: text("meta_access_token"),
  metaPhoneNumberId: varchar("meta_phone_number_id", { length: 100 }),
  metaApiVersion: varchar("meta_api_version", { length: 20 }).notNull().default("v22.0"),
  // WaSMS gateway
  wasmsApiKey: varchar("wasms_api_key", { length: 255 }),
  wasmsWhatsappId: varchar("wasms_whatsapp_id", { length: 100 }),
  // Custom API
  customApiUrl: text("custom_api_url"),
  customApiMethod: varchar("custom_api_method", { length: 10 }).notNull().default("POST"),
  customAuthHeader: text("custom_auth_header"),
  customContentType: varchar("custom_content_type", { length: 100 }).notNull().default("application/json"),
  customBodyTemplate: text("custom_body_template").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsappLogSchema = createInsertSchema(whatsappLogsTable).omit({ id: true, createdAt: true });
export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;
export type InsertWhatsappLog = z.infer<typeof insertWhatsappLogSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
export type WhatsappTemplate = typeof whatsappTemplatesTable.$inferSelect;
export type WhatsappLog = typeof whatsappLogsTable.$inferSelect;
export type Settings = typeof settingsTable.$inferSelect;
export type WhatsappConfig = typeof whatsappConfigTable.$inferSelect;
