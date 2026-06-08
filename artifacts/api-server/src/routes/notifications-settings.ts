import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, notificationsTable, whatsappTemplatesTable, settingsTable, whatsappConfigTable, whatsappLogsTable } from "@workspace/db";
import { MarkNotificationReadParams, CreateWhatsappTemplateBody, UpdateWhatsappTemplateBody, UpdateWhatsappTemplateParams, DeleteWhatsappTemplateParams, UpdateSettingsBody, SendWhatsappMessageBody, UpdateWhatsappConfigBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { loadWhatsappConfig, isProviderConfigured, loadConfigAndSend, dispatchTrigger, sendDirect } from "../lib/whatsapp.js";

const router = Router();

async function xr(q: ReturnType<typeof sql>): Promise<any[]> {
  const r = (await db.execute(q)) as any;
  if (Array.isArray(r) && Array.isArray(r[0])) return r[0];
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

const PKR = (n: number) => `PKR ${Number(n).toLocaleString("en-PK")}`;

async function businessName(): Promise<string> {
  const [s] = await db.select().from(settingsTable).limit(1);
  return s?.companyName || s?.storeName || "Our Store";
}

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

router.get("/notifications", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(notificationsTable).orderBy(sql`created_at desc`).limit(50);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, params.data.id));
  const [row] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/notifications/read-all", requireAuth, async (_req, res): Promise<void> => {
  await db.update(notificationsTable).set({ isRead: true });
  res.json({ success: true });
});

// ─── WHATSAPP TEMPLATES ──────────────────────────────────────────────────────

const DEFAULT_TEMPLATES = [
  // SALES & POS
  { name: "Sales Invoice", trigger: "sales_invoice", message: "Dear {customer_name},\n\nThank you for shopping with {company_name}.\n\nInvoice #: {invoice_no}\nAmount: {amount}\nDate: {date}\n\nWe appreciate your business!\n\nRegards,\n{company_name}" },
  { name: "Counter Sale Invoice", trigger: "counter_sale_invoice", message: "Thank you for your purchase!\n\nInvoice #: {invoice_no}\nAmount: {amount}\nDate: {date} | Time: {time}\n\n{company_name}\n{branch_name}" },
  { name: "Credit Sale Invoice", trigger: "credit_sale_invoice", message: "Dear {customer_name},\n\nYour credit sale has been recorded.\n\nInvoice #: {invoice_no}\nTotal: {amount}\nDue Amount: {due_amount}\n\nPlease ensure payment by the due date.\n\nRegards,\n{company_name}" },
  { name: "Payment Received (Sales)", trigger: "payment_received_sales", message: "Dear {customer_name},\n\nWe have received your payment of {amount} against Invoice #{invoice_no}.\n\nRemaining Balance: {due_amount}\nDate: {date}\n\nThank you!\n{company_name}" },
  { name: "Due Payment Reminder", trigger: "due_payment_reminder", message: "Dear {customer_name},\n\nThis is a friendly reminder that you have an outstanding balance of {due_amount} on your account.\n\nInvoice #: {invoice_no}\nDate: {date}\n\nPlease make payment at your earliest convenience.\n\nRegards,\n{company_name}" },
  { name: "Sales Return", trigger: "sales_return", message: "Dear {customer_name},\n\nYour return has been processed successfully.\n\nReturn Invoice #: {invoice_no}\nRefund Amount: {amount}\nDate: {date}\n\nWe hope to serve you again.\n\nRegards,\n{company_name}" },

  // ORDERS
  { name: "Order Confirmation", trigger: "order_confirmed", message: "Dear {customer_name},\n\nYour order has been confirmed!\n\nOrder #: {order_no}\nAmount: {amount}\nDate: {date}\n\nWe will notify you when it is ready.\n\n{company_name}" },
  { name: "Order Approved", trigger: "order_approved", message: "Dear {customer_name},\n\nGreat news! Your order #{order_no} has been approved and is now being processed.\n\nAmount: {amount}\nDate: {date}\n\n{company_name}" },
  { name: "Order Processing", trigger: "order_processing", message: "Dear {customer_name},\n\nYour order #{order_no} is currently being processed and prepared.\n\nEstimated completion: {date}\n\nWe will keep you updated.\n\n{company_name}" },
  { name: "Order Packed", trigger: "order_packed", message: "Dear {customer_name},\n\nYour order #{order_no} has been packed and is ready for dispatch.\n\nAmount: {amount}\n\nYou will receive another notification when it is out for delivery.\n\n{company_name}" },
  { name: "Out For Delivery", trigger: "order_out_for_delivery", message: "Dear {customer_name},\n\nYour order #{order_no} is out for delivery!\n\nDriver: {driver_name}\nRoute: {route_name}\n\nPlease be available to receive your order.\n\n{company_name}" },
  { name: "Order Delivered", trigger: "order_delivered", message: "Dear {customer_name},\n\nYour order #{order_no} has been delivered successfully!\n\nAmount: {amount}\nDate: {date}\n\nThank you for choosing {company_name}. We hope to serve you again!" },
  { name: "Order Cancelled", trigger: "order_cancelled", message: "Dear {customer_name},\n\nWe regret to inform you that your order #{order_no} has been cancelled.\n\nIf you have any questions, please contact us.\n\nSorry for the inconvenience.\n{company_name}" },
  { name: "Order Returned", trigger: "order_returned", message: "Dear {customer_name},\n\nYour order return #{order_no} has been received.\n\nRefund Amount: {amount}\nDate: {date}\n\nThe refund will be processed shortly.\n\n{company_name}" },

  // CUSTOMERS
  { name: "Customer Registration", trigger: "customer_registered", message: "Welcome to {company_name}!\n\nDear {customer_name},\n\nYour customer account has been created successfully.\n\nDate: {date}\n\nThank you for joining us. We look forward to serving you!\n\n{company_name}" },
  { name: "Welcome Message", trigger: "customer_welcome", message: "Welcome aboard, {customer_name}! 🎉\n\nWe are thrilled to have you as part of the {company_name} family.\n\nEnjoy exclusive deals, fast delivery, and great products.\n\nHappy Shopping!\n{company_name}" },
  { name: "Birthday Wish", trigger: "customer_birthday", message: "🎂 Happy Birthday, {customer_name}!\n\nWishing you a wonderful day filled with joy and happiness.\n\nAs a birthday gift, enjoy a special discount on your next purchase!\n\nWith love,\n{company_name}" },
  { name: "Loyalty Reward", trigger: "customer_loyalty", message: "Dear {customer_name},\n\nCongratulations! You have earned a loyalty reward from {company_name}.\n\nYour reward is ready to use on your next purchase.\n\nDate: {date}\n\nThank you for your continued support!\n{company_name}" },
  { name: "Promotional Offer", trigger: "customer_promo", message: "🎉 Special Offer for {customer_name}!\n\nExclusive promotion from {company_name}:\n\n• {product_name}\n• Limited time offer\n• Date: {date}\n\nHurry! Don't miss out.\n\n{company_name}" },
  { name: "New Product Announcement", trigger: "customer_new_product", message: "📢 New Arrival at {company_name}!\n\nDear {customer_name},\n\nWe are excited to announce: {product_name}\n\nBe the first to get it!\n\nVisit us at {branch_name} today.\n\n{company_name}" },

  // PURCHASES
  { name: "Purchase Order Sent", trigger: "purchase_order_sent", message: "Dear {supplier_name},\n\nA new Purchase Order has been sent to you.\n\nPO #: {invoice_no}\nAmount: {amount}\nDate: {date}\n\nPlease confirm receipt and provide delivery timeline.\n\nRegards,\n{company_name}" },
  { name: "Purchase Received", trigger: "purchase_received", message: "Dear {supplier_name},\n\nWe are pleased to confirm receipt of goods for PO #{invoice_no}.\n\nAmount: {amount}\nDate: {date}\n\nThank you for your prompt delivery.\n\n{company_name}" },
  { name: "Purchase Return", trigger: "purchase_return", message: "Dear {supplier_name},\n\nPlease be informed that we are returning the following goods.\n\nReturn Ref #: {invoice_no}\nAmount: {amount}\nDate: {date}\n\nKindly process the credit/refund at your earliest.\n\nRegards,\n{company_name}" },

  // SUPPLIERS
  { name: "Supplier Registration", trigger: "supplier_registered", message: "Dear {supplier_name},\n\nWelcome to {company_name}'s supplier network!\n\nYour supplier account has been created successfully.\n\nDate: {date}\n\nWe look forward to a long and fruitful partnership.\n\n{company_name}" },
  { name: "Supplier Payment Confirmation", trigger: "supplier_payment", message: "Dear {supplier_name},\n\nWe confirm that a payment of {amount} has been processed to your account.\n\nReference #: {invoice_no}\nDate: {date}\nPayment Method: {payment_method}\n\nThank you.\n\n{company_name}" },
  { name: "Supplier Outstanding Reminder", trigger: "supplier_outstanding", message: "Dear {supplier_name},\n\nThis is a reminder regarding an outstanding balance of {due_amount}.\n\nReference #: {invoice_no}\nDate: {date}\n\nWe will process the payment soon. Thank you for your patience.\n\n{company_name}" },

  // EMPLOYEES
  { name: "Employee Account Created", trigger: "employee_account_created", message: "Dear {employee_name},\n\nYour employee account at {company_name} has been created.\n\nBranch: {branch_name}\nDate: {date}\n\nPlease contact your manager for login credentials.\n\nWelcome to the team!\n{company_name}" },
  { name: "Employee Login Credentials", trigger: "employee_credentials", message: "Dear {employee_name},\n\nYour login credentials for {company_name} ERP system:\n\nBranch: {branch_name}\nDate: {date}\n\nPlease log in and change your password immediately.\n\nFor support, contact your administrator.\n\n{company_name}" },
  { name: "Salary Notification", trigger: "employee_salary", message: "Dear {employee_name},\n\nYour salary of {amount} has been processed for {date}.\n\nPayment Method: {payment_method}\n\nFor any queries, please contact HR.\n\nRegards,\n{company_name}" },
  { name: "Attendance Notification", trigger: "employee_attendance", message: "Dear {employee_name},\n\nYour attendance has been recorded.\n\nDate: {date}\nTime: {time}\nBranch: {branch_name}\n\nThank you.\n{company_name}" },
  { name: "Task Assignment", trigger: "employee_task", message: "Dear {employee_name},\n\nA new task has been assigned to you.\n\nDate: {date}\nBranch: {branch_name}\n\nPlease check the system for full task details.\n\nRegards,\n{company_name}" },
  { name: "Delivery Assignment", trigger: "employee_delivery", message: "Dear {employee_name},\n\nYou have been assigned a delivery task.\n\nRoute: {route_name}\nDate: {date}\nTime: {time}\n\nPlease check the delivery app for full details.\n\n{company_name}" },

  // DELIVERY
  { name: "Route Assigned", trigger: "delivery_route_assigned", message: "Dear {driver_name},\n\nA new delivery route has been assigned to you.\n\nRoute: {route_name}\nDate: {date}\nTime: {time}\n\nPlease be ready at the scheduled time.\n\n{company_name}" },
  { name: "Delivery Assigned", trigger: "delivery_assigned", message: "Dear {customer_name},\n\nYour order #{order_no} has been assigned to a delivery agent.\n\nDriver: {driver_name}\nExpected Delivery: {date}\n\nYou will be notified once delivered.\n\n{company_name}" },
  { name: "Delivery Completed", trigger: "delivery_completed", message: "Dear {customer_name},\n\nYour order #{order_no} has been delivered successfully!\n\nDriver: {driver_name}\nDate: {date} | Time: {time}\n\nThank you for choosing {company_name}!" },
  { name: "Failed Delivery", trigger: "delivery_failed", message: "Dear {customer_name},\n\nWe were unable to deliver your order #{order_no}.\n\nDate: {date}\n\nOur team will contact you to reschedule.\n\nSorry for the inconvenience.\n{company_name}" },
  { name: "Cash Collection Reminder", trigger: "delivery_cash_reminder", message: "Dear {driver_name},\n\nPlease remember to submit the cash collection for today.\n\nAmount: {amount}\nDate: {date}\nRoute: {route_name}\n\nSubmit before end of shift.\n\n{company_name}" },
  { name: "Cash Submission Confirmed", trigger: "delivery_cash_submitted", message: "Dear {driver_name},\n\nYour cash submission of {amount} has been received and confirmed.\n\nDate: {date} | Time: {time}\nRoute: {route_name}\n\nThank you.\n{company_name}" },

  // ACCOUNTS
  { name: "Payment Received (Accounts)", trigger: "payment_received", message: "Dear {customer_name},\n\nPayment of {amount} has been received.\n\nRef #: {invoice_no}\nDate: {date}\nMethod: {payment_method}\n\nThank you for your timely payment.\n\n{company_name}" },
  { name: "Payment Confirmation", trigger: "payment_confirmed", message: "Dear {customer_name},\n\nThis confirms that your payment of {amount} has been successfully processed.\n\nTransaction Ref #: {invoice_no}\nDate: {date}\n\nKeep this for your records.\n\n{company_name}" },
  { name: "Expense Approval", trigger: "expense_approved", message: "Dear {employee_name},\n\nYour expense request of {amount} has been approved.\n\nDate: {date}\nApproved by: {company_name} Management\n\nThe amount will be processed shortly." },
  { name: "Cash Collection Report", trigger: "cash_report", message: "Cash Collection Report\n\nBranch: {branch_name}\nDate: {date}\nTotal Collected: {amount}\nDriver: {driver_name}\n\nReport generated by {company_name}." },

  // SYSTEM
  { name: "Password Reset", trigger: "password_reset", message: "Dear {employee_name},\n\nA password reset has been requested for your {company_name} account.\n\nDate: {date} | Time: {time}\n\nIf you did not request this, please contact your administrator immediately." },
  { name: "Login Verification", trigger: "login_verification", message: "Dear {employee_name},\n\nA login was detected on your {company_name} account.\n\nDate: {date} | Time: {time}\n\nIf this was not you, please contact support immediately." },
  { name: "Security Alert", trigger: "security_alert", message: "⚠️ Security Alert - {company_name}\n\nDear {employee_name},\n\nA security event has been detected on your account.\n\nDate: {date} | Time: {time}\n\nPlease contact your system administrator immediately." },
  { name: "Backup Completed", trigger: "backup_completed", message: "System Notification - {company_name}\n\nDatabase backup completed successfully.\n\nDate: {date} | Time: {time}\nBranch: {branch_name}\n\nAll data is safe and secured." },
  { name: "System Notification", trigger: "system_notification", message: "System Notification from {company_name}\n\nDear {employee_name},\n\nDate: {date} | Time: {time}\n\nPlease log in to the system for more details." },
];

// Bilingual (English + Urdu) accounting / ledger templates that power the
// WhatsApp Communication System. Each entry carries an explicit `language`.
// Variables: {business_name} {customer_name} {supplier_name} {amount} {balance}
// {advance_balance} {invoice_no} {ledger_reference} {transaction_type} {date} {branch} {user}
const LEDGER_TEMPLATES: { name: string; trigger: string; message: string; language: "en" | "ur" }[] = [
  // ── CUSTOMER: payment received ──
  { language: "en", name: "Customer Payment Received", trigger: "payment_received", message: "Dear {customer_name},\n\nWe have received your payment of {amount}.\nReference: {ledger_reference}\nOutstanding Balance: {balance}\nDate: {date}\n\nThank you!\n{business_name}" },
  { language: "ur", name: "Customer Payment Received (Urdu)", trigger: "payment_received", message: "محترم {customer_name}،\n\nہمیں آپ کی {amount} کی ادائیگی موصول ہوگئی ہے۔\nحوالہ: {ledger_reference}\nبقایا رقم: {balance}\nتاریخ: {date}\n\nشکریہ!\n{business_name}" },
  // ── CUSTOMER: advance deposit ──
  { language: "en", name: "Customer Advance Received", trigger: "advance_deposit", message: "Dear {customer_name},\n\nWe have received an advance of {amount}.\nReference: {ledger_reference}\nAdvance Balance: {advance_balance}\nDate: {date}\n\nThank you!\n{business_name}" },
  { language: "ur", name: "Customer Advance Received (Urdu)", trigger: "advance_deposit", message: "محترم {customer_name}،\n\nہمیں {amount} کی پیشگی رقم موصول ہوئی ہے۔\nحوالہ: {ledger_reference}\nپیشگی بیلنس: {advance_balance}\nتاریخ: {date}\n\nشکریہ!\n{business_name}" },
  // ── CUSTOMER: refund (advance paid out) ──
  { language: "en", name: "Customer Refund", trigger: "advance_paid", message: "Dear {customer_name},\n\nA refund of {amount} has been processed.\nReference: {ledger_reference}\nRemaining Advance: {advance_balance}\nDate: {date}\n\n{business_name}" },
  { language: "ur", name: "Customer Refund (Urdu)", trigger: "advance_paid", message: "محترم {customer_name}،\n\n{amount} کی رقم واپس کر دی گئی ہے۔\nحوالہ: {ledger_reference}\nباقی پیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}" },
  // ── CUSTOMER: outstanding reminder ──
  { language: "en", name: "Customer Outstanding Reminder", trigger: "customer_outstanding", message: "Dear {customer_name},\n\nThis is a reminder that your outstanding balance is {balance}.\nDate: {date}\n\nPlease clear your dues at your earliest convenience.\n\nRegards,\n{business_name}" },
  { language: "ur", name: "Customer Outstanding Reminder (Urdu)", trigger: "customer_outstanding", message: "محترم {customer_name}،\n\nیہ یاد دہانی ہے کہ آپ کی بقایا رقم {balance} ہے۔\nتاریخ: {date}\n\nبراہ کرم اپنی واجب الادا رقم جلد ادا کریں۔\n\nشکریہ،\n{business_name}" },
  // ── CUSTOMER: overdue recovery ──
  { language: "en", name: "Customer Overdue Notice", trigger: "customer_overdue", message: "Dear {customer_name},\n\nYour account has an OVERDUE balance of {balance}.\nDate: {date}\n\nKindly settle the amount immediately to avoid service disruption.\n\n{business_name}" },
  { language: "ur", name: "Customer Overdue Notice (Urdu)", trigger: "customer_overdue", message: "محترم {customer_name}،\n\nآپ کے کھاتے میں {balance} کی واجب الادا (اوور ڈیو) رقم ہے۔\nتاریخ: {date}\n\nبراہ کرم فوری ادائیگی کریں۔\n\n{business_name}" },
  // ── CUSTOMER: statement ──
  { language: "en", name: "Customer Statement", trigger: "customer_statement", message: "Dear {customer_name},\n\nPlease find your account statement from {business_name}.\nClosing Balance: {balance}\nAdvance: {advance_balance}\nDate: {date}\n\n{business_name}" },
  { language: "ur", name: "Customer Statement (Urdu)", trigger: "customer_statement", message: "محترم {customer_name}،\n\n{business_name} کی جانب سے آپ کے کھاتے کا گوشوارہ۔\nاختتامی بیلنس: {balance}\nپیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}" },
  // ── CUSTOMER: summary ──
  { language: "en", name: "Customer Summary", trigger: "customer_summary", message: "Dear {customer_name},\n\nAccount Summary\nOutstanding: {balance}\nAdvance: {advance_balance}\nDate: {date}\n\n{business_name}" },
  { language: "ur", name: "Customer Summary (Urdu)", trigger: "customer_summary", message: "محترم {customer_name}،\n\nکھاتے کا خلاصہ\nبقایا: {balance}\nپیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}" },

  // ── SUPPLIER: payment made ──
  { language: "en", name: "Supplier Payment Made", trigger: "supplier_payment_made", message: "Dear {supplier_name},\n\nWe have made a payment of {amount} to your account.\nReference: {ledger_reference}\nOutstanding Payable: {balance}\nDate: {date}\n\nThank you,\n{business_name}" },
  { language: "ur", name: "Supplier Payment Made (Urdu)", trigger: "supplier_payment_made", message: "محترم {supplier_name}،\n\nہم نے آپ کے کھاتے میں {amount} کی ادائیگی کی ہے۔\nحوالہ: {ledger_reference}\nبقایا واجب الادا: {balance}\nتاریخ: {date}\n\nشکریہ،\n{business_name}" },
  // ── SUPPLIER: advance paid ──
  { language: "en", name: "Supplier Advance Paid", trigger: "supplier_advance_paid", message: "Dear {supplier_name},\n\nWe have paid you an advance of {amount}.\nReference: {ledger_reference}\nAdvance Balance: {advance_balance}\nDate: {date}\n\n{business_name}" },
  { language: "ur", name: "Supplier Advance Paid (Urdu)", trigger: "supplier_advance_paid", message: "محترم {supplier_name}،\n\nہم نے آپ کو {amount} کی پیشگی رقم ادا کی ہے۔\nحوالہ: {ledger_reference}\nپیشگی بیلنس: {advance_balance}\nتاریخ: {date}\n\n{business_name}" },
  // ── SUPPLIER: refund received ──
  { language: "en", name: "Supplier Refund", trigger: "supplier_refund", message: "Dear {supplier_name},\n\nWe acknowledge a refund of {amount} received from you.\nReference: {ledger_reference}\nDate: {date}\n\n{business_name}" },
  { language: "ur", name: "Supplier Refund (Urdu)", trigger: "supplier_refund", message: "محترم {supplier_name}،\n\nہمیں آپ کی جانب سے {amount} کی واپسی موصول ہوئی ہے۔\nحوالہ: {ledger_reference}\nتاریخ: {date}\n\n{business_name}" },
  // ── SUPPLIER: outstanding ──
  { language: "en", name: "Supplier Outstanding Reminder", trigger: "supplier_outstanding", message: "Dear {supplier_name},\n\nOur outstanding payable to you is {balance}.\nDate: {date}\n\nWe will process the payment soon. Thank you for your patience.\n\n{business_name}" },
  { language: "ur", name: "Supplier Outstanding Reminder (Urdu)", trigger: "supplier_outstanding", message: "محترم {supplier_name}،\n\nآپ کو ہماری واجب الادا رقم {balance} ہے۔\nتاریخ: {date}\n\nہم جلد ادائیگی کر دیں گے۔ شکریہ۔\n\n{business_name}" },
  // ── SUPPLIER: overdue ──
  { language: "en", name: "Supplier Overdue Notice", trigger: "supplier_overdue", message: "Dear {supplier_name},\n\nThis is regarding an overdue payable of {balance} on our account with you.\nDate: {date}\n\nWe are arranging settlement at the earliest.\n\n{business_name}" },
  { language: "ur", name: "Supplier Overdue Notice (Urdu)", trigger: "supplier_overdue", message: "محترم {supplier_name}،\n\nیہ آپ کے ساتھ ہمارے کھاتے میں {balance} کی واجب الادا رقم سے متعلق ہے۔\nتاریخ: {date}\n\nہم جلد بندوبست کر رہے ہیں۔\n\n{business_name}" },
  // ── SUPPLIER: statement ──
  { language: "en", name: "Supplier Statement", trigger: "supplier_statement", message: "Dear {supplier_name},\n\nPlease find your account statement from {business_name}.\nClosing Payable: {balance}\nAdvance: {advance_balance}\nDate: {date}\n\n{business_name}" },
  { language: "ur", name: "Supplier Statement (Urdu)", trigger: "supplier_statement", message: "محترم {supplier_name}،\n\n{business_name} کی جانب سے آپ کے کھاتے کا گوشوارہ۔\nاختتامی واجب الادا: {balance}\nپیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}" },
  // ── SUPPLIER: summary ──
  { language: "en", name: "Supplier Summary", trigger: "supplier_summary", message: "Dear {supplier_name},\n\nAccount Summary\nPayable: {balance}\nAdvance: {advance_balance}\nDate: {date}\n\n{business_name}" },
  { language: "ur", name: "Supplier Summary (Urdu)", trigger: "supplier_summary", message: "محترم {supplier_name}،\n\nکھاتے کا خلاصہ\nواجب الادا: {balance}\nپیشگی: {advance_balance}\nتاریخ: {date}\n\n{business_name}" },
];

router.post("/whatsapp/templates/seed-defaults", requireAuth, async (_req, res): Promise<void> => {
  const existing = await db.select({ trigger: whatsappTemplatesTable.trigger, language: whatsappTemplatesTable.language }).from(whatsappTemplatesTable);
  // Dedupe by trigger+language so bilingual variants seed independently and
  // re-running never duplicates an existing variant.
  const existingKeys = new Set(existing.map(r => `${r.trigger}::${r.language ?? "en"}`));

  const all = [
    ...DEFAULT_TEMPLATES.map(t => ({ ...t, language: "en" as const })),
    ...LEDGER_TEMPLATES,
  ];
  const toInsert = all.filter(t => !existingKeys.has(`${t.trigger}::${t.language}`));
  if (toInsert.length === 0) {
    res.json({ inserted: 0, message: "All default templates already exist" });
    return;
  }

  await db.insert(whatsappTemplatesTable).values(toInsert.map(t => ({
    name: t.name, trigger: t.trigger, message: t.message, language: t.language, isActive: true,
  })));

  res.json({ inserted: toInsert.length, message: `Inserted ${toInsert.length} default templates` });
});

router.get("/whatsapp/templates", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(whatsappTemplatesTable).orderBy(whatsappTemplatesTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// language/businessType aren't in the generated zod body yet, so read them
// directly from req.body and merge after the schema parse (existing pattern).
function extraTemplateFields(body: any): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  if (body?.language === "en" || body?.language === "ur") extra.language = body.language;
  if (typeof body?.businessType === "string") extra.businessType = body.businessType || null;
  else if (body?.businessType === null) extra.businessType = null;
  return extra;
}

router.post("/whatsapp/templates", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWhatsappTemplateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [{ id: insId }] = await db.insert(whatsappTemplatesTable).values({ ...parsed.data, ...extraTemplateFields(req.body) }).$returningId();
  const [row] = await db.select().from(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, insId));
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/whatsapp/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateWhatsappTemplateParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateWhatsappTemplateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(whatsappTemplatesTable).set({ ...parsed.data, ...extraTemplateFields(req.body) }).where(eq(whatsappTemplatesTable.id, params.data.id));
  const [row] = await db.select().from(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/whatsapp/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteWhatsappTemplateParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, params.data.id));
  res.sendStatus(204);
});

// ─── WHATSAPP GATEWAY (provider-independent) ─────────────────────────────────

const PROVIDER_LABEL: Record<string, string> = {
  meta: "Meta WhatsApp Cloud API",
  wasms: "WaSMS",
  custom: "Custom API",
};

router.get("/whatsapp/status", requireAuth, async (_req, res): Promise<void> => {
  const config = await loadWhatsappConfig();
  res.json({
    configured: isProviderConfigured(config),
    provider: PROVIDER_LABEL[config.provider] ?? config.provider,
  });
});

// Full gateway config — admin only. Secrets are NEVER returned; the client
// receives boolean *Configured flags instead so it can show "set / not set".
router.get("/whatsapp/config", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const config = await loadWhatsappConfig();
  res.json({
    automationEnabled: config.automationEnabled,
    defaultLanguage: config.defaultLanguage,
    provider: config.provider,
    metaPhoneNumberId: config.metaPhoneNumberId,
    metaApiVersion: config.metaApiVersion,
    metaTokenConfigured: !!config.metaAccessToken,
    wasmsWhatsappId: config.wasmsWhatsappId,
    wasmsKeyConfigured: !!config.wasmsApiKey,
    customApiUrl: config.customApiUrl,
    customApiMethod: config.customApiMethod,
    customContentType: config.customContentType,
    customBodyTemplate: config.customBodyTemplate,
    customAuthConfigured: !!config.customAuthHeader,
    envFallbackActive: !!process.env["WASMS_API_KEY"],
  });
});

router.put("/whatsapp/config", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateWhatsappConfigBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  // Non-secret fields are always applied; secret fields are applied only when a
  // non-empty value is supplied, so a blank field never wipes a stored secret.
  const upd: Record<string, unknown> = {};
  if (d.automationEnabled !== undefined) upd.automationEnabled = d.automationEnabled;
  if (d.provider !== undefined) upd.provider = d.provider;
  // defaultLanguage isn't in the generated body yet — read it directly.
  const dl = (req.body as any)?.defaultLanguage;
  if (dl === "en" || dl === "ur") upd.defaultLanguage = dl;
  if (d.metaPhoneNumberId !== undefined) upd.metaPhoneNumberId = d.metaPhoneNumberId || null;
  if (d.metaApiVersion !== undefined && d.metaApiVersion.trim()) upd.metaApiVersion = d.metaApiVersion.trim();
  if (d.wasmsWhatsappId !== undefined) upd.wasmsWhatsappId = d.wasmsWhatsappId || null;
  if (d.customApiUrl !== undefined) upd.customApiUrl = d.customApiUrl || null;
  if (d.customApiMethod !== undefined && d.customApiMethod.trim()) upd.customApiMethod = d.customApiMethod.trim().toUpperCase();
  if (d.customContentType !== undefined && d.customContentType.trim()) upd.customContentType = d.customContentType.trim();
  if (d.customBodyTemplate !== undefined && d.customBodyTemplate.trim()) upd.customBodyTemplate = d.customBodyTemplate;
  // Secrets: only when explicitly provided and non-empty.
  if (d.metaAccessToken !== undefined && d.metaAccessToken.trim()) upd.metaAccessToken = d.metaAccessToken.trim();
  if (d.wasmsApiKey !== undefined && d.wasmsApiKey.trim()) upd.wasmsApiKey = d.wasmsApiKey.trim();
  if (d.customAuthHeader !== undefined && d.customAuthHeader.trim()) upd.customAuthHeader = d.customAuthHeader.trim();

  // Always operate on the canonical singleton row (id=1). ensureSchema() guarantees
  // it exists; the insert is a defensive fallback that can never create a duplicate.
  await db
    .insert(whatsappConfigTable)
    .values({ id: 1, customBodyTemplate: '{"to":"{{to}}","message":"{{message}}"}', ...upd })
    .onDuplicateKeyUpdate({ set: { id: sql`id` } });
  if (Object.keys(upd).length) {
    await db.update(whatsappConfigTable).set(upd).where(eq(whatsappConfigTable.id, 1));
  }
  let [row] = await db.select().from(whatsappConfigTable).where(eq(whatsappConfigTable.id, 1));
  if (!row) [row] = await db.select().from(whatsappConfigTable).where(eq(whatsappConfigTable.id, 1));

  res.json({
    automationEnabled: row.automationEnabled,
    defaultLanguage: row.defaultLanguage,
    provider: row.provider,
    metaPhoneNumberId: row.metaPhoneNumberId,
    metaApiVersion: row.metaApiVersion,
    metaTokenConfigured: !!row.metaAccessToken,
    wasmsWhatsappId: row.wasmsWhatsappId,
    wasmsKeyConfigured: !!(row.wasmsApiKey || process.env["WASMS_API_KEY"]),
    customApiUrl: row.customApiUrl,
    customApiMethod: row.customApiMethod,
    customContentType: row.customContentType,
    customBodyTemplate: row.customBodyTemplate,
    customAuthConfigured: !!row.customAuthHeader,
    envFallbackActive: !!process.env["WASMS_API_KEY"],
  });
});

router.post("/whatsapp/send", requireAuth, async (req, res): Promise<void> => {
  const parsed = SendWhatsappMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const result = await loadConfigAndSend(parsed.data.phone, parsed.data.message, req.log);
  if (!result.success) {
    res.status(502).json(result);
    return;
  }
  res.json(result);
});

// ─── WHATSAPP LOGS ───────────────────────────────────────────────────────────

// Audit trail of every send attempt with filters (status / entityType / search / date).
router.get("/whatsapp/logs", requireAuth, async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" && req.query.status ? String(req.query.status) : "";
  const entityType = typeof req.query.entityType === "string" && req.query.entityType ? String(req.query.entityType) : "";
  const search = typeof req.query.search === "string" ? String(req.query.search).trim() : "";
  const startDate = typeof req.query.startDate === "string" ? String(req.query.startDate) : "";
  const endDate = typeof req.query.endDate === "string" ? String(req.query.endDate) : "";
  const limit = Math.min(Number(req.query.limit) || 200, 1000);

  const conds: any[] = [sql`1=1`];
  if (status === "sent" || status === "failed") conds.push(sql`AND status = ${status}`);
  if (entityType === "customer" || entityType === "supplier" || entityType === "other") conds.push(sql`AND entity_type = ${entityType}`);
  if (search) {
    const like = `%${search}%`;
    conds.push(sql`AND (recipient_name LIKE ${like} OR phone LIKE ${like} OR message LIKE ${like} OR template_name LIKE ${like})`);
  }
  if (startDate) conds.push(sql`AND cast(created_at as date) >= cast(${startDate} as date)`);
  if (endDate) conds.push(sql`AND cast(created_at as date) <= cast(${endDate} as date)`);
  const where = sql.join(conds, sql` `);

  const rows = await xr(sql`
    SELECT id, entity_type as entityType, entity_id as entityId, recipient_name as recipientName,
      phone, \`trigger\`, template_name as templateName, message, status, error, provider,
      created_by_id as createdById, created_at as createdAt
    FROM whatsapp_logs
    WHERE ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit}
  `);
  res.json(rows);
});

// Resend an existing log entry verbatim (same phone + message). Creates a new log row.
router.post("/whatsapp/logs/:id/resend", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid log id" }); return; }
  const [log] = await db.select().from(whatsappLogsTable).where(eq(whatsappLogsTable.id, id));
  if (!log) { res.status(404).json({ error: "Log not found" }); return; }

  const result = await sendDirect({
    entityType: log.entityType as any,
    entityId: log.entityId,
    recipientName: log.recipientName,
    phone: log.phone,
    message: log.message,
    trigger: log.trigger,
    templateName: log.templateName,
    createdById: req.user?.userId ?? null,
  }, req.log);

  if (!result.success) { res.status(502).json(result); return; }
  res.json(result);
});

// ─── ACCOUNTING: BALANCE HELPERS ─────────────────────────────────────────────

// Live receivable/payable + advance for one entity, using the same formulas as
// the ledger endpoints so reminders/statements always agree with the ledger.
async function computeEntityBalance(entityType: "customer" | "supplier", id: number): Promise<{ name: string; phone: string; balance: number; advance: number } | null> {
  if (entityType === "customer") {
    const [c] = await xr(sql`
      SELECT name, phone, cast(advance_balance as decimal(18,2)) as advance FROM customers WHERE id = ${id}
    `);
    if (!c) return null;
    const [b] = await xr(sql`
      SELECT
        coalesce((SELECT sum(CASE WHEN is_return = false THEN cast(due_amount as decimal(18,2)) ELSE -cast(total_amount as decimal(18,2)) END) FROM sales WHERE customer_id = ${id}), 0)
        + coalesce((SELECT sum(CASE WHEN direction = 'debit' THEN cast(amount as decimal(18,2)) ELSE -cast(amount as decimal(18,2)) END) FROM customer_transactions WHERE customer_id = ${id} AND account = 'receivable'), 0)
        as balance
    `);
    return { name: c.name, phone: c.phone ?? "", balance: Number(b?.balance ?? 0), advance: Number(c.advance ?? 0) };
  }
  const [s] = await xr(sql`
    SELECT name, phone, cast(advance_balance as decimal(18,2)) as advance FROM suppliers WHERE id = ${id}
  `);
  if (!s) return null;
  const [b] = await xr(sql`
    SELECT
      coalesce((SELECT sum(cast(due_amount as decimal(18,2))) FROM purchases WHERE supplier_id = ${id}), 0)
      - coalesce((SELECT sum(cast(total_amount as decimal(18,2))) FROM purchase_returns WHERE supplier_id = ${id}), 0)
      + coalesce((SELECT sum(CASE WHEN direction = 'debit' THEN cast(amount as decimal(18,2)) ELSE -cast(amount as decimal(18,2)) END) FROM supplier_transactions WHERE supplier_id = ${id} AND account = 'payable'), 0)
      as balance
  `);
  return { name: s.name, phone: s.phone ?? "", balance: Number(b?.balance ?? 0), advance: Number(s.advance ?? 0) };
}

// ─── WHATSAPP: BULK / STATEMENT / SUMMARY ────────────────────────────────────

// Bulk outstanding/overdue reminders to all customers OR suppliers with a positive balance.
router.post("/whatsapp/bulk-reminders", requireAuth, async (req, res): Promise<void> => {
  const audience = req.body?.audience === "supplier" ? "supplier" : "customer";
  const scope = req.body?.scope === "overdue" ? "overdue" : "outstanding";
  const trigger = audience === "supplier"
    ? (scope === "overdue" ? "supplier_overdue" : "supplier_outstanding")
    : (scope === "overdue" ? "customer_overdue" : "customer_outstanding");

  const list = audience === "supplier"
    ? await xr(sql`
        SELECT id, name, phone, balance FROM (
          SELECT s.id, s.name, s.phone,
            coalesce((SELECT sum(cast(due_amount as decimal(18,2))) FROM purchases WHERE supplier_id = s.id), 0)
            - coalesce((SELECT sum(cast(total_amount as decimal(18,2))) FROM purchase_returns WHERE supplier_id = s.id), 0)
            + coalesce((SELECT sum(CASE WHEN direction = 'debit' THEN cast(amount as decimal(18,2)) ELSE -cast(amount as decimal(18,2)) END) FROM supplier_transactions WHERE supplier_id = s.id AND account = 'payable'), 0)
            as balance
          FROM suppliers s
        ) t WHERE balance > 0
      `)
    : await xr(sql`
        SELECT id, name, phone, balance FROM (
          SELECT c.id, c.name, c.phone,
            coalesce((SELECT sum(CASE WHEN is_return = false THEN cast(due_amount as decimal(18,2)) ELSE -cast(total_amount as decimal(18,2)) END) FROM sales WHERE customer_id = c.id), 0)
            + coalesce((SELECT sum(CASE WHEN direction = 'debit' THEN cast(amount as decimal(18,2)) ELSE -cast(amount as decimal(18,2)) END) FROM customer_transactions WHERE customer_id = c.id AND account = 'receivable'), 0)
            as balance
          FROM customers c
        ) t WHERE balance > 0
      `);

  let sent = 0, failed = 0, skipped = 0;
  for (const e of list) {
    const r = await dispatchTrigger(
      trigger,
      { entityType: audience, id: Number(e.id), name: e.name, phone: e.phone ?? "" },
      { balance: PKR(Number(e.balance)) },
      { manual: true, createdById: req.user?.userId ?? null },
      req.log,
    );
    if (r === null) skipped++;
    else if (r.success) sent++;
    else failed++;
  }

  res.json({ audience, scope, trigger, total: list.length, sent, failed, skipped });
});

// Send an account statement (closing balance + advance) to a single entity.
router.post("/whatsapp/send-statement", requireAuth, async (req, res): Promise<void> => {
  const entityType = req.body?.entityType === "supplier" ? "supplier" : "customer";
  const id = Number(req.body?.id);
  if (!id) { res.status(400).json({ error: "Invalid entity id" }); return; }
  const bal = await computeEntityBalance(entityType, id);
  if (!bal) { res.status(404).json({ error: "Entity not found" }); return; }

  const trigger = entityType === "supplier" ? "supplier_statement" : "customer_statement";
  const r = await dispatchTrigger(
    trigger,
    { entityType, id, name: bal.name, phone: bal.phone },
    { balance: PKR(bal.balance), advance_balance: PKR(bal.advance) },
    { manual: true, createdById: req.user?.userId ?? null },
    req.log,
  );
  if (r === null) { res.status(400).json({ error: "No active statement template, provider not configured, or missing phone." }); return; }
  if (!r.success) { res.status(502).json(r); return; }
  res.json(r);
});

// Send a short account summary (balance + advance) to a single entity.
router.post("/whatsapp/send-summary", requireAuth, async (req, res): Promise<void> => {
  const entityType = req.body?.entityType === "supplier" ? "supplier" : "customer";
  const id = Number(req.body?.id);
  if (!id) { res.status(400).json({ error: "Invalid entity id" }); return; }
  const bal = await computeEntityBalance(entityType, id);
  if (!bal) { res.status(404).json({ error: "Entity not found" }); return; }

  const trigger = entityType === "supplier" ? "supplier_summary" : "customer_summary";
  const r = await dispatchTrigger(
    trigger,
    { entityType, id, name: bal.name, phone: bal.phone },
    { balance: PKR(bal.balance), advance_balance: PKR(bal.advance) },
    { manual: true, createdById: req.user?.userId ?? null },
    req.log,
  );
  if (r === null) { res.status(400).json({ error: "No active summary template, provider not configured, or missing phone." }); return; }
  if (!r.success) { res.status(502).json(r); return; }
  res.json(r);
});

// ─── REPORTS: WHATSAPP ───────────────────────────────────────────────────────

function reportRange(req: any) {
  const startDate = req.query.startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = req.query.endDate || new Date().toISOString().slice(0, 10);
  return { startDate: String(startDate), endDate: String(endDate) };
}

// Notification report: totals + breakdown by trigger and entity type.
router.get("/reports/whatsapp-notifications", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = reportRange(req);
  const range = sql`cast(created_at as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)`;

  const [[totals], byTrigger, byEntity, rows] = await Promise.all([
    xr(sql`
      SELECT count(*) as total,
        sum(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        sum(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM whatsapp_logs WHERE ${range}
    `),
    xr(sql`
      SELECT coalesce(\`trigger\`, 'manual') as triggerName, count(*) as total,
        sum(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        sum(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM whatsapp_logs WHERE ${range}
      GROUP BY coalesce(\`trigger\`, 'manual') ORDER BY total DESC
    `),
    xr(sql`
      SELECT entity_type as entityType, count(*) as total
      FROM whatsapp_logs WHERE ${range}
      GROUP BY entity_type
    `),
    xr(sql`
      SELECT id, entity_type as entityType, recipient_name as recipientName, phone,
        \`trigger\`, template_name as templateName, status, provider, created_at as createdAt
      FROM whatsapp_logs WHERE ${range}
      ORDER BY created_at DESC, id DESC LIMIT 500
    `),
  ]);

  res.json({
    startDate, endDate,
    totals: {
      total: Number(totals?.total ?? 0),
      sent: Number(totals?.sent ?? 0),
      failed: Number(totals?.failed ?? 0),
    },
    byTrigger: byTrigger.map((r: any) => ({ trigger: r.triggerName, total: Number(r.total), sent: Number(r.sent), failed: Number(r.failed) })),
    byEntity: byEntity.map((r: any) => ({ entityType: r.entityType, total: Number(r.total) })),
    rows,
  });
});

// Delivery report: sent vs failed over time + failure list.
router.get("/reports/whatsapp-delivery", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = reportRange(req);
  const range = sql`cast(created_at as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)`;

  const [byDay, byProvider, failures] = await Promise.all([
    xr(sql`
      SELECT cast(created_at as date) as date,
        sum(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        sum(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM whatsapp_logs WHERE ${range}
      GROUP BY cast(created_at as date) ORDER BY date ASC
    `),
    xr(sql`
      SELECT provider, count(*) as total,
        sum(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        sum(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM whatsapp_logs WHERE ${range}
      GROUP BY provider
    `),
    xr(sql`
      SELECT id, entity_type as entityType, recipient_name as recipientName, phone,
        \`trigger\`, template_name as templateName, error, provider, created_at as createdAt
      FROM whatsapp_logs WHERE ${range} AND status = 'failed'
      ORDER BY created_at DESC, id DESC LIMIT 500
    `),
  ]);

  res.json({
    startDate, endDate,
    byDay: byDay.map((r: any) => ({ date: r.date, sent: Number(r.sent), failed: Number(r.failed) })),
    byProvider: byProvider.map((r: any) => ({ provider: r.provider, total: Number(r.total), sent: Number(r.sent), failed: Number(r.failed) })),
    failures,
  });
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable);
  if (!settings) {
    const [{ id: insId }] = await db.insert(settingsTable).values({}).$returningId();
    [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, insId));
  }
  res.json({ ...settings, taxRate: Number(settings.taxRate) });
});

router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  let [settings] = await db.select().from(settingsTable);
  const upd: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.taxRate !== undefined) upd.taxRate = String(parsed.data.taxRate);
  if (settings) {
    const settingsId = settings.id;
    await db.update(settingsTable).set(upd).where(eq(settingsTable.id, settingsId));
    [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, settingsId));
  } else {
    const [{ id: insId }] = await db.insert(settingsTable).values(upd).$returningId();
    [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, insId));
  }
  res.json({ ...settings, taxRate: Number(settings.taxRate) });
});

export { router as notifSettingsRouter };
export default router;
