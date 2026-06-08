import { Router } from "express";
import { eq, like, sql } from "drizzle-orm";
import { db, customersTable, ledgerEntriesTable } from "@workspace/db";
import { CreateCustomerBody, UpdateCustomerBody, UpdateCustomerParams, DeleteCustomerParams, ListCustomersQueryParams, GetCustomerParams, GetCustomerLedgerParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";
import { triggerAutomation } from "../lib/whatsapp.js";

const router = Router();

const fmtCustomer = (c: any) => ({
  ...c,
  creditLimit: Number(c.creditLimit),
  balance: Number(c.balance),
  advanceBalance: Number(c.advanceBalance ?? 0),
  advancePaidBalance: Number(c.advancePaidBalance ?? 0),
  totalSpent: Number(c.totalSpent),
  createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
});

router.get("/customers", requireAuth, async (req, res): Promise<void> => {
  const params = ListCustomersQueryParams.safeParse(req.query);
  let query = db.select().from(customersTable).$dynamic();
  if (params.success && params.data.search) {
    query = query.where(like(customersTable.name, `%${params.data.search}%`));
  }
  const customers = await query.orderBy(sql`created_at desc`);
  res.json(customers.map(fmtCustomer));
});

router.post("/customers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, phone, email, address, creditLimit } = parsed.data;
  const [{ id: _insId }] = await db.insert(customersTable).values({
    name, phone,
    email: email ?? null,
    address: address ?? null,
    creditLimit: String(creditLimit ?? 0),
  }).$returningId();
  const [c] = await db.select().from(customersTable).where(eq(customersTable.id, _insId));
  void triggerAutomation({ trigger: "customer_registered", customerId: c.id }, req.log);
  res.status(201).json(fmtCustomer(c));
});

router.get("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [c] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!c) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(fmtCustomer(c));
});

router.patch("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const upd: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.creditLimit !== undefined) upd.creditLimit = String(parsed.data.creditLimit);
  await db.update(customersTable).set(upd).where(eq(customersTable.id, params.data.id));
  const [c] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!c) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(fmtCustomer(c));
});

router.delete("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(customersTable).where(eq(customersTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/customers/:id/ledger", requireAuth, async (req, res): Promise<void> => {
  const params = GetCustomerLedgerParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const entries = await db.select().from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.entityId, params.data.id))
    .orderBy(sql`created_at desc`);
  res.json(entries.map(e => ({
    ...e,
    amount: Number(e.amount),
    balance: Number(e.balance),
    createdAt: e.createdAt.toISOString(),
  })));
});

export default router;
