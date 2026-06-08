import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, cashCollectionsTable, expensesTable } from "@workspace/db";
import { CreateCashCollectionBody, UpdateCashCollectionBody, UpdateCashCollectionParams, CreateExpenseBody, UpdateExpenseBody, UpdateExpenseParams, DeleteExpenseParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// CASH COLLECTIONS
router.get("/cash-collections", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select({
    id: cashCollectionsTable.id,
    employeeId: cashCollectionsTable.employeeId,
    employeeName: sql<string | null>`(select name from employees where id = cash_collections.employee_id)`,
    orderId: cashCollectionsTable.orderId,
    amount: cashCollectionsTable.amount,
    type: cashCollectionsTable.type,
    status: cashCollectionsTable.status,
    notes: cashCollectionsTable.notes,
    createdAt: cashCollectionsTable.createdAt,
  }).from(cashCollectionsTable).orderBy(sql`created_at desc`);
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

router.post("/cash-collections", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCashCollectionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { employeeId, orderId, amount, type, notes } = parsed.data;
  const [{ id: insId }] = await db.insert(cashCollectionsTable).values({
    employeeId, orderId: orderId ?? null, amount: String(amount), type, notes: notes ?? null,
  }).$returningId();
  const [row] = await db.select().from(cashCollectionsTable).where(eq(cashCollectionsTable.id, insId));
  res.status(201).json({ ...row, employeeName: null, amount: Number(row.amount), createdAt: row.createdAt.toISOString() });
});

router.patch("/cash-collections/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCashCollectionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCashCollectionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(cashCollectionsTable).set(parsed.data).where(eq(cashCollectionsTable.id, params.data.id));
  const [row] = await db.select().from(cashCollectionsTable).where(eq(cashCollectionsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, employeeName: null, amount: Number(row.amount), createdAt: row.createdAt.toISOString() });
});

// EXPENSES
router.get("/expenses", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(expensesTable).orderBy(sql`created_at desc`);
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

router.post("/expenses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { title, amount, category, date, notes, branchId } = parsed.data;
  const [{ id: insId }] = await db.insert(expensesTable).values({
    title, amount: String(amount), category, date, notes: notes ?? null, branchId: branchId ?? null,
  }).$returningId();
  const [row] = await db.select().from(expensesTable).where(eq(expensesTable.id, insId));
  res.status(201).json({ ...row, amount: Number(row.amount), createdAt: row.createdAt.toISOString() });
});

router.patch("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const upd: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.amount !== undefined) upd.amount = String(parsed.data.amount);
  await db.update(expensesTable).set(upd).where(eq(expensesTable.id, params.data.id));
  const [row] = await db.select().from(expensesTable).where(eq(expensesTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Expense not found" }); return; }
  res.json({ ...row, amount: Number(row.amount), createdAt: row.createdAt.toISOString() });
});

router.delete("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
