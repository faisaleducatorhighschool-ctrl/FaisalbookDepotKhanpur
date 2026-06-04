import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, notificationsTable, whatsappTemplatesTable, settingsTable } from "@workspace/db";
import { MarkNotificationReadParams, CreateWhatsappTemplateBody, UpdateWhatsappTemplateBody, UpdateWhatsappTemplateParams, DeleteWhatsappTemplateParams, UpdateSettingsBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

router.get("/notifications", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(notificationsTable).orderBy(sql`created_at desc`).limit(50);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, params.data.id)).returning();
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

router.post("/whatsapp/templates/seed-defaults", requireAuth, async (_req, res): Promise<void> => {
  const existing = await db.select({ trigger: whatsappTemplatesTable.trigger }).from(whatsappTemplatesTable);
  const existingTriggers = new Set(existing.map(r => r.trigger));

  const toInsert = DEFAULT_TEMPLATES.filter(t => !existingTriggers.has(t.trigger));
  if (toInsert.length === 0) {
    res.json({ inserted: 0, message: "All default templates already exist" });
    return;
  }

  await db.insert(whatsappTemplatesTable).values(toInsert.map(t => ({
    name: t.name, trigger: t.trigger, message: t.message, isActive: true,
  })));

  res.json({ inserted: toInsert.length, message: `Inserted ${toInsert.length} default templates` });
});

router.get("/whatsapp/templates", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(whatsappTemplatesTable).orderBy(whatsappTemplatesTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/whatsapp/templates", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWhatsappTemplateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(whatsappTemplatesTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/whatsapp/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateWhatsappTemplateParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateWhatsappTemplateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(whatsappTemplatesTable).set(parsed.data).where(eq(whatsappTemplatesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/whatsapp/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteWhatsappTemplateParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, params.data.id));
  res.sendStatus(204);
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values({}).returning();
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
    [settings] = await db.update(settingsTable).set(upd).where(eq(settingsTable.id, settings.id)).returning();
  } else {
    [settings] = await db.insert(settingsTable).values(upd).returning();
  }
  res.json({ ...settings, taxRate: Number(settings.taxRate) });
});

export { router as notifSettingsRouter };
export default router;
