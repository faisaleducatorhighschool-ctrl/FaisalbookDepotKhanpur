import { eq, and, sql } from "drizzle-orm";
import { db, whatsappConfigTable, whatsappTemplatesTable, settingsTable, customersTable, suppliersTable, notificationsTable, whatsappLogsTable, businessConfigTable } from "@workspace/db";
import { logger } from "./logger.js";

type LogLike = Pick<typeof logger, "info" | "warn" | "error">;

const WASMS_ENDPOINT = "https://wasms.net/api/public/v1/whatsapp/send";

export interface ResolvedWhatsappConfig {
  automationEnabled: boolean;
  defaultLanguage: string;
  provider: string;
  metaAccessToken: string | null;
  metaPhoneNumberId: string | null;
  metaApiVersion: string;
  wasmsApiKey: string | null;
  wasmsWhatsappId: string | null;
  customApiUrl: string | null;
  customApiMethod: string;
  customAuthHeader: string | null;
  customContentType: string;
  customBodyTemplate: string;
}

// Normalize a phone number to international digits (Pakistan default).
// Strips spaces/dashes/plus; converts a leading 0 to 92.
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = "92" + d.slice(1);
  return d;
}

// Loads the single whatsapp_config row (creating it on first use), then layers
// environment-variable fallbacks for the WaSMS credentials so existing
// deployments that only set WASMS_API_KEY keep working.
export async function loadWhatsappConfig(): Promise<ResolvedWhatsappConfig> {
  // The canonical singleton row (id=1) is guaranteed to exist by ensureSchema().
  let [row] = await db.select().from(whatsappConfigTable).where(eq(whatsappConfigTable.id, 1));
  if (!row) {
    // Defensive fallback (e.g. ensureSchema not yet run): create the canonical row.
    await db
      .insert(whatsappConfigTable)
      .values({ id: 1, customBodyTemplate: '{"to":"{{to}}","message":"{{message}}"}' })
      .onDuplicateKeyUpdate({ set: { id: sql`id` } });
    [row] = await db.select().from(whatsappConfigTable).where(eq(whatsappConfigTable.id, 1));
  }
  return {
    automationEnabled: row.automationEnabled,
    defaultLanguage: row.defaultLanguage || "en",
    provider: row.provider,
    metaAccessToken: row.metaAccessToken,
    metaPhoneNumberId: row.metaPhoneNumberId,
    metaApiVersion: row.metaApiVersion || "v22.0",
    wasmsApiKey: row.wasmsApiKey || process.env["WASMS_API_KEY"] || null,
    wasmsWhatsappId: row.wasmsWhatsappId || process.env["WASMS_WHATSAPP_ID"] || null,
    customApiUrl: row.customApiUrl,
    customApiMethod: row.customApiMethod || "POST",
    customAuthHeader: row.customAuthHeader,
    customContentType: row.customContentType || "application/json",
    customBodyTemplate: row.customBodyTemplate || '{"to":"{{to}}","message":"{{message}}"}',
  };
}

// Whether the currently-selected provider has enough credentials to send.
export function isProviderConfigured(c: ResolvedWhatsappConfig): boolean {
  switch (c.provider) {
    case "meta":
      return !!(c.metaAccessToken && c.metaPhoneNumberId);
    case "custom":
      return !!c.customApiUrl;
    case "wasms":
    default:
      return !!c.wasmsApiKey;
  }
}

export interface SendResult {
  success: boolean;
  message: string;
}

// Sends a single message through the configured provider. Never throws.
export async function sendWhatsapp(
  c: ResolvedWhatsappConfig,
  rawPhone: string,
  message: string,
  log: LogLike = logger,
): Promise<SendResult> {
  const to = normalizePhone(rawPhone);
  if (to.length < 8) return { success: false, message: "Invalid phone number." };

  try {
    if (c.provider === "meta") {
      return await sendViaMeta(c, to, message, log);
    }
    if (c.provider === "custom") {
      return await sendViaCustom(c, to, message, log);
    }
    return await sendViaWasms(c, to, message, log);
  } catch (err) {
    log.error({ err, provider: c.provider }, "WhatsApp send request errored");
    return { success: false, message: "Could not reach the WhatsApp gateway." };
  }
}

async function sendViaMeta(c: ResolvedWhatsappConfig, to: string, message: string, log: LogLike): Promise<SendResult> {
  if (!c.metaAccessToken || !c.metaPhoneNumberId) {
    return { success: false, message: "Meta WhatsApp Cloud API is not configured." };
  }
  const url = `https://graph.facebook.com/${c.metaApiVersion}/${c.metaPhoneNumberId}/messages`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.metaAccessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: message },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await upstream.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!upstream.ok) {
    const errMsg = typeof body === "object" && body !== null && "error" in body
      ? String((body as { error: { message?: string } }).error?.message ?? "Meta API rejected the message")
      : "Meta API rejected the message";
    log.warn({ status: upstream.status, body }, "Meta WhatsApp send failed");
    return { success: false, message: errMsg };
  }
  return { success: true, message: "Message sent" };
}

async function sendViaWasms(c: ResolvedWhatsappConfig, to: string, message: string, log: LogLike): Promise<SendResult> {
  if (!c.wasmsApiKey) {
    return { success: false, message: "WhatsApp gateway is not connected. Add the WaSMS API key." };
  }
  const payload: Record<string, string> = { to, message };
  if (c.wasmsWhatsappId) payload["whatsapp_id"] = c.wasmsWhatsappId;
  const upstream = await fetch(WASMS_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.wasmsApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const text = await upstream.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  const ok = upstream.ok && typeof body === "object" && body !== null && (body as { success?: unknown }).success === true;
  const message2 = typeof body === "object" && body !== null && "message" in body
    ? String((body as { message: unknown }).message)
    : ok ? "Message sent" : "Gateway rejected the message";
  if (!ok) {
    log.warn({ status: upstream.status, body }, "WaSMS send failed");
    return { success: false, message: message2 };
  }
  return { success: true, message: message2 };
}

async function sendViaCustom(c: ResolvedWhatsappConfig, to: string, message: string, log: LogLike): Promise<SendResult> {
  if (!c.customApiUrl) {
    return { success: false, message: "Custom WhatsApp API URL is not configured." };
  }
  const method = (c.customApiMethod || "POST").toUpperCase();
  const isJson = c.customContentType.toLowerCase().includes("json");
  // Escape replacements so they remain valid inside a JSON body template.
  const safeTo = isJson ? JSON.stringify(to).slice(1, -1) : to;
  const safeMsg = isJson ? JSON.stringify(message).slice(1, -1) : message;
  const body = c.customBodyTemplate
    .replaceAll("{{to}}", safeTo)
    .replaceAll("{{message}}", safeMsg);

  const headers: Record<string, string> = { "Content-Type": c.customContentType };
  if (c.customAuthHeader) headers["Authorization"] = c.customAuthHeader;

  const init: RequestInit = { method, headers, signal: AbortSignal.timeout(15000) };
  if (method !== "GET" && method !== "HEAD") init.body = body;

  const upstream = await fetch(c.customApiUrl, init);
  const text = await upstream.text();
  if (!upstream.ok) {
    log.warn({ status: upstream.status, body: text.slice(0, 500) }, "Custom WhatsApp send failed");
    return { success: false, message: `Custom API responded ${upstream.status}` };
  }
  return { success: true, message: "Message sent" };
}

// Replaces {placeholder} tokens in a template with provided values. Unknown
// placeholders are left untouched so missing data is visible rather than blank.
export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    if (value === null || value === undefined) continue;
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

export type EntityType = "customer" | "supplier" | "manual";
type Vars = Record<string, string | number | null | undefined>;

export interface RecipientRef {
  entityType: "customer" | "supplier";
  id: number;
  name: string;
  phone: string;
}

// The platform's primary business type scopes which template variant wins when
// several share a trigger; null when unset (single-business installs).
async function getPrimaryBusinessType(): Promise<string | null> {
  try {
    const [row] = await db.select().from(businessConfigTable).where(eq(businessConfigTable.id, 1));
    return row?.primaryBusinessType ?? null;
  } catch {
    return null;
  }
}

// Picks the best active template for a trigger with deterministic precedence:
// language + matching business_type → language + unscoped → language (any scope)
// → matching business_type (any language) → unscoped → first. This keeps dispatch
// stable when both business-scoped and generic variants exist on one trigger.
async function pickTemplate(trigger: string, preferLang: string, businessType: string | null) {
  const rows = await db.select().from(whatsappTemplatesTable)
    .where(and(eq(whatsappTemplatesTable.trigger, trigger), eq(whatsappTemplatesTable.isActive, true)));
  if (rows.length === 0) return null;
  const langOk = (r: typeof rows[number]) => (r.language || "en") === preferLang;
  const bt = (r: typeof rows[number]) => r.businessType ?? null;
  return (businessType != null ? rows.find(r => langOk(r) && bt(r) === businessType) : undefined)
    ?? rows.find(r => langOk(r) && bt(r) == null)
    ?? rows.find(r => langOk(r))
    ?? (businessType != null ? rows.find(r => bt(r) === businessType) : undefined)
    ?? rows.find(r => bt(r) == null)
    ?? rows[0];
}

// Default values for every documented placeholder so unfilled tokens render as
// empty strings rather than leaking raw "{token}" text into a customer message.
function buildBaseVars(settings: typeof settingsTable.$inferSelect | undefined, recipient: RecipientRef): Vars {
  const business = settings?.companyName || settings?.storeName || "";
  const now = new Date();
  const base: Vars = {
    business_name: business,
    company_name: business,
    branch: settings?.branchName || "",
    branch_name: settings?.branchName || "",
    customer_name: "",
    supplier_name: "",
    amount: "",
    balance: "",
    advance_balance: "",
    invoice_no: "",
    ledger_reference: "",
    transaction_type: "",
    user: "",
    date: now.toLocaleDateString("en-PK"),
    time: now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
  };
  base[recipient.entityType === "customer" ? "customer_name" : "supplier_name"] = recipient.name;
  return base;
}

// Append-only audit of a send attempt + an in-app notification for the bell.
async function recordSend(args: {
  entityType: EntityType;
  entityId?: number | null;
  recipientName?: string | null;
  phone: string;
  trigger?: string | null;
  templateName?: string | null;
  message: string;
  result: SendResult;
  provider: string;
  createdById?: number | null;
  notify?: boolean;
}, log: LogLike): Promise<void> {
  await db.insert(whatsappLogsTable).values({
    entityType: args.entityType,
    entityId: args.entityId ?? null,
    recipientName: args.recipientName ?? null,
    phone: args.phone,
    trigger: args.trigger ?? null,
    templateName: args.templateName ?? null,
    message: args.message,
    status: args.result.success ? "sent" : "failed",
    error: args.result.success ? null : args.result.message,
    provider: args.provider,
    createdById: args.createdById ?? null,
  }).catch((err) => log.error({ err }, "writeWhatsappLog failed (suppressed)"));

  if (args.notify !== false) {
    const label = args.templateName || args.trigger || "WhatsApp message";
    await db.insert(notificationsTable).values({
      title: args.result.success ? `WhatsApp sent: ${label}` : `WhatsApp failed: ${label}`,
      message: args.result.success
        ? `Sent to ${args.recipientName ?? args.phone}`
        : `Could not send to ${args.recipientName ?? args.phone}: ${args.result.message}`,
      type: args.result.success ? "success" : "error",
      referenceId: args.entityId ?? null,
    }).catch(() => undefined);
  }
}

// Core dispatcher: resolve template → render → send → log. Returns null when the
// send is intentionally skipped (automation off, no active template, no phone),
// otherwise the SendResult. Set opts.manual for admin-initiated sends so the
// master automation switch is bypassed (provider + active template still required).
export async function dispatchTrigger(
  trigger: string,
  recipient: RecipientRef,
  variables: Vars = {},
  opts: { createdById?: number | null; manual?: boolean } = {},
  log: LogLike = logger,
): Promise<SendResult | null> {
  const config = await loadWhatsappConfig();
  if (!opts.manual && !config.automationEnabled) return null;
  if (!isProviderConfigured(config)) {
    log.info({ trigger }, "WhatsApp skipped: provider not configured");
    return null;
  }
  const businessType = await getPrimaryBusinessType();
  const template = await pickTemplate(trigger, config.defaultLanguage, businessType);
  if (!template) return null;
  const phone = normalizePhone(recipient.phone ?? "");
  if (phone.length < 8) return null;

  const [settings] = await db.select().from(settingsTable).limit(1);
  const vars: Vars = { ...buildBaseVars(settings, recipient), ...variables };
  const message = renderTemplate(template.message, vars);
  const result = await sendWhatsapp(config, recipient.phone, message, log);
  await recordSend({
    entityType: recipient.entityType, entityId: recipient.id, recipientName: recipient.name,
    phone: recipient.phone, trigger, templateName: template.name, message, result,
    provider: config.provider, createdById: opts.createdById,
  }, log);
  if (!result.success) log.warn({ trigger, id: recipient.id, message: result.message }, "WhatsApp send failed");
  return result;
}

export interface AutomationInput {
  trigger: string;
  customerId?: number | null;
  variables?: Vars;
}

// Customer automation (fire-and-forget). Resolves the registered customer and
// dispatches; walk-in / no-phone customers are silently skipped.
export async function triggerAutomation(input: AutomationInput, log: LogLike = logger): Promise<void> {
  try {
    if (!input.customerId) return;
    const [customer] = await db.select().from(customersTable)
      .where(eq(customersTable.id, input.customerId)).limit(1);
    if (!customer) return;
    await dispatchTrigger(input.trigger,
      { entityType: "customer", id: customer.id, name: customer.name, phone: customer.phone ?? "" },
      input.variables ?? {}, {}, log);
  } catch (err) {
    log.error({ err, trigger: input.trigger }, "triggerAutomation crashed (suppressed)");
  }
}

export interface SupplierAutomationInput {
  trigger: string;
  supplierId?: number | null;
  variables?: Vars;
}

// Supplier automation (fire-and-forget). Mirrors triggerAutomation for suppliers.
export async function triggerSupplierAutomation(input: SupplierAutomationInput, log: LogLike = logger): Promise<void> {
  try {
    if (!input.supplierId) return;
    const [supplier] = await db.select().from(suppliersTable)
      .where(eq(suppliersTable.id, input.supplierId)).limit(1);
    if (!supplier) return;
    await dispatchTrigger(input.trigger,
      { entityType: "supplier", id: supplier.id, name: supplier.name, phone: supplier.phone ?? "" },
      input.variables ?? {}, {}, log);
  } catch (err) {
    log.error({ err, trigger: input.trigger }, "triggerSupplierAutomation crashed (suppressed)");
  }
}

// Sends a pre-rendered message (statements, summaries, resends, manual sends),
// bypassing template resolution. Always logged.
export async function sendDirect(args: {
  entityType: EntityType;
  entityId?: number | null;
  recipientName?: string | null;
  phone: string;
  message: string;
  trigger?: string | null;
  templateName?: string | null;
  createdById?: number | null;
}, log: LogLike = logger): Promise<SendResult> {
  const config = await loadWhatsappConfig();
  if (!isProviderConfigured(config)) {
    const result: SendResult = { success: false, message: "WhatsApp is not configured. Set up a provider in WhatsApp → API Settings." };
    await recordSend({ ...args, result, provider: config.provider }, log);
    return result;
  }
  const result = await sendWhatsapp(config, args.phone, args.message, log);
  await recordSend({ ...args, result, provider: config.provider }, log);
  return result;
}

// Helper used by the test-send endpoint: send with whatever provider is configured.
export async function loadConfigAndSend(rawPhone: string, message: string, log: LogLike = logger): Promise<SendResult> {
  const config = await loadWhatsappConfig();
  if (!isProviderConfigured(config)) {
    return { success: false, message: "WhatsApp is not configured. Set up a provider in WhatsApp → API Settings." };
  }
  return sendWhatsapp(config, rawPhone, message, log);
}
