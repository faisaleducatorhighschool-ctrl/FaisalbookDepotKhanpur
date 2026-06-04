import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

async function xr(q: ReturnType<typeof sql>): Promise<any[]> {
  const r = await db.execute(q) as any;
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

function dateRange(req: any) {
  const startDate = req.query.startDate || new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const endDate = req.query.endDate || new Date().toISOString().slice(0, 10);
  return { startDate: String(startDate), endDate: String(endDate) };
}

// ── Customer Ledger ────────────────────────────────────────────────────────────

router.get("/ledger/customer/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid customer id" }); return; }
  const { startDate, endDate } = dateRange(req);

  const [customer] = await xr(sql`
    SELECT id, name, phone, email, balance::numeric as balance, credit_limit::numeric as credit_limit
    FROM customers WHERE id = ${id}
  `);
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const [openingData] = await xr(sql`
    SELECT coalesce(sum(due_amount::numeric), 0) as opening_balance
    FROM sales
    WHERE customer_id = ${id}
      AND created_at::date < ${startDate}::date
      AND is_return = false
  `);

  const transactions = await xr(sql`
    SELECT
      s.id,
      s.invoice_number as reference,
      s.created_at as date,
      CASE WHEN s.is_return THEN 'return' ELSE 'sale' END as type,
      CASE WHEN s.is_return THEN 0 ELSE s.total_amount::numeric END as debit,
      CASE WHEN s.is_return THEN s.total_amount::numeric ELSE s.paid_amount::numeric END as credit,
      s.total_amount::numeric as amount,
      s.due_amount::numeric as due
    FROM sales s
    WHERE s.customer_id = ${id}
      AND s.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    ORDER BY s.created_at ASC
  `);

  const openingBalance = Number(openingData?.opening_balance ?? 0);
  let runningBalance = openingBalance;
  const rows = transactions.map(t => {
    runningBalance = runningBalance + Number(t.debit) - Number(t.credit);
    return {
      id: Number(t.id), reference: t.reference, date: t.date, type: t.type,
      debit: Number(t.debit), credit: Number(t.credit), balance: runningBalance,
    };
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  res.json({
    customer: {
      id: Number(customer.id), name: customer.name, phone: customer.phone,
      email: customer.email, currentBalance: Number(customer.balance),
    },
    openingBalance, totalDebit, totalCredit, closingBalance, rows,
  });
});

// ── Supplier Ledger ────────────────────────────────────────────────────────────

router.get("/ledger/supplier/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid supplier id" }); return; }
  const { startDate, endDate } = dateRange(req);

  const [supplier] = await xr(sql`
    SELECT id, name, company, phone, email, balance::numeric as balance
    FROM suppliers WHERE id = ${id}
  `);
  if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }

  const [[openingData], [openingReturnData]] = await Promise.all([
    xr(sql`
      SELECT coalesce(sum(due_amount::numeric), 0) as opening_balance
      FROM purchases WHERE supplier_id = ${id} AND created_at::date < ${startDate}::date
    `),
    xr(sql`
      SELECT coalesce(sum(total_amount::numeric), 0) as opening_returns
      FROM purchase_returns WHERE supplier_id = ${id} AND created_at::date < ${startDate}::date
    `),
  ]);

  const [purchases, returns] = await Promise.all([
    xr(sql`
      SELECT p.id, p.purchase_number as reference, p.created_at as date,
        'purchase' as type, p.total_amount::numeric as debit, p.paid_amount::numeric as credit
      FROM purchases p
      WHERE p.supplier_id = ${id}
        AND p.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      ORDER BY p.created_at ASC
    `),
    xr(sql`
      SELECT pr.id, pr.return_number as reference, pr.created_at as date,
        'return' as type, 0::numeric as debit, pr.total_amount::numeric as credit
      FROM purchase_returns pr
      WHERE pr.supplier_id = ${id}
        AND pr.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      ORDER BY pr.created_at ASC
    `),
  ]);

  const openingBalance = Number(openingData?.opening_balance ?? 0) - Number(openingReturnData?.opening_returns ?? 0);

  const allTx = [...purchases, ...returns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = openingBalance;
  const rows = allTx.map(t => {
    runningBalance = runningBalance + Number(t.debit) - Number(t.credit);
    return {
      id: Number(t.id), reference: t.reference, date: t.date, type: t.type,
      debit: Number(t.debit), credit: Number(t.credit), balance: runningBalance,
    };
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  res.json({
    supplier: {
      id: Number(supplier.id), name: supplier.name, company: supplier.company,
      phone: supplier.phone, email: supplier.email, currentBalance: Number(supplier.balance),
    },
    openingBalance, totalDebit, totalCredit, closingBalance, rows,
  });
});

export default router;
