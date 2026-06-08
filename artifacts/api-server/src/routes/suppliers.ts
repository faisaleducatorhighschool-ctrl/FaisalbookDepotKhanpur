import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, suppliersTable, ledgerEntriesTable } from "@workspace/db";
import { CreateSupplierBody, UpdateSupplierBody, UpdateSupplierParams, DeleteSupplierParams, GetSupplierParams, GetSupplierLedgerParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

const fmt = (s: any) => ({
  ...s,
  balance: Number(s.balance),
  createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
});

router.get("/suppliers", requireAuth, async (_req, res): Promise<void> => {
  const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  res.json(suppliers.map(fmt));
});

router.post("/suppliers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSupplierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, phone, email, address, company } = parsed.data;
  const [{ id: _insId }] = await db.insert(suppliersTable).values({ name, phone, email: email ?? null, address: address ?? null, company: company ?? null }).$returningId();
  const [s] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, _insId));
  res.status(201).json(fmt(s));
});

router.get("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSupplierParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [s] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, params.data.id));
  if (!s) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(fmt(s));
});

router.patch("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSupplierParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSupplierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(suppliersTable).set(parsed.data).where(eq(suppliersTable.id, params.data.id));
  const [s] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, params.data.id));
  if (!s) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(fmt(s));
});

router.delete("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSupplierParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(suppliersTable).where(eq(suppliersTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/suppliers/:id/ledger", requireAuth, async (req, res): Promise<void> => {
  const params = GetSupplierLedgerParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const entries = await db.select().from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.entityId, params.data.id))
    .orderBy(sql`created_at desc`);
  res.json(entries.map(e => ({ ...e, amount: Number(e.amount), balance: Number(e.balance), createdAt: e.createdAt.toISOString() })));
});

export default router;
