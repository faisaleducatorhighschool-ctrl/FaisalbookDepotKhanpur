import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { getCustomerReceivable, getSupplierPayable } from "../lib/accounting.js";
import { computeLedgerRows } from "../lib/ledger-compute.js";

const router = Router();

async function xr(q: ReturnType<typeof sql>): Promise<any[]> {
  const r = await db.execute(q) as any;
  // mysql2 returns [rows, fields]; rows is the first element.
  if (Array.isArray(r) && Array.isArray(r[0])) return r[0];
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
    SELECT id, name, phone, email, address,
      cast(balance as decimal(18,2)) as balance,
      cast(credit_limit as decimal(18,2)) as credit_limit,
      cast(advance_balance as decimal(18,2)) as advance_balance,
      cast(advance_paid_balance as decimal(18,2)) as advance_paid_balance
    FROM customers WHERE id = ${id}
  `);
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  // Receivable opening = sales (due − returns) + receivable transactions, before the window.
  const [[salesOpening], [txnOpening]] = await Promise.all([
    xr(sql`
      SELECT
        coalesce(sum(CASE WHEN is_return = false THEN cast(due_amount as decimal(18,2)) ELSE 0 END), 0)
          - coalesce(sum(CASE WHEN is_return = true THEN cast(total_amount as decimal(18,2)) ELSE 0 END), 0)
          as opening_balance
      FROM sales
      WHERE customer_id = ${id} AND cast(created_at as date) < cast(${startDate} as date)
    `),
    xr(sql`
      SELECT coalesce(sum(CASE WHEN direction = 'debit' THEN cast(amount as decimal(18,2)) ELSE -cast(amount as decimal(18,2)) END), 0) as opening_txn
      FROM customer_transactions
      WHERE customer_id = ${id} AND account = 'receivable'
        AND cast(txn_date as date) < cast(${startDate} as date)
    `),
  ]);

  // Receivable ledger = sales/returns + receivable transactions (payments, adjustments).
  const [sales, recvTxns] = await Promise.all([
    xr(sql`
      SELECT
        s.id, s.invoice_number as reference, s.created_at as date,
        CASE WHEN s.is_return THEN 'return' ELSE 'sale' END as type,
        CASE WHEN s.is_return THEN 0 ELSE cast(s.total_amount as decimal(18,2)) END as debit,
        CASE WHEN s.is_return THEN cast(s.total_amount as decimal(18,2)) ELSE cast(s.paid_amount as decimal(18,2)) END as credit,
        NULL as method, NULL as note
      FROM sales s
      WHERE s.customer_id = ${id}
        AND cast(s.created_at as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)
    `),
    xr(sql`
      SELECT t.id, t.reference_no as reference, t.txn_date as date, t.txn_type as type,
        CASE WHEN t.direction = 'debit' THEN cast(t.amount as decimal(18,2)) ELSE 0 END as debit,
        CASE WHEN t.direction = 'credit' THEN cast(t.amount as decimal(18,2)) ELSE 0 END as credit,
        t.payment_method as method, t.note as note
      FROM customer_transactions t
      WHERE t.customer_id = ${id} AND t.account = 'receivable'
        AND cast(t.txn_date as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)
    `),
  ]);

  const openingBalance = Number(salesOpening?.opening_balance ?? 0) + Number(txnOpening?.opening_txn ?? 0);
  const merged = [...sales, ...recvTxns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  // Returns are kept as their OWN column (not lumped into "credit"): a sales
  // return is goods coming back, not a payment, so it must not inflate the
  // payments/credit total. It still reduces the running balance.
  const { rows, totalDebit, totalCredit, totalReturns, closingBalance } = computeLedgerRows(merged, openingBalance);

  // Advance sub-ledger (deposits, refunds, auto-applied at POS) with running balance.
  const [advTxnOpening] = await xr(sql`
    SELECT coalesce(sum(CASE WHEN direction = 'credit' THEN cast(amount as decimal(18,2)) ELSE -cast(amount as decimal(18,2)) END), 0) as opening_adv
    FROM customer_transactions
    WHERE customer_id = ${id} AND account = 'advance'
      AND cast(txn_date as date) < cast(${startDate} as date)
  `);
  const advRows = await xr(sql`
    SELECT t.id, t.reference_no as reference, t.txn_date as date, t.txn_type as type,
      t.direction, cast(t.amount as decimal(18,2)) as amount, t.payment_method as method, t.note
    FROM customer_transactions t
    WHERE t.customer_id = ${id} AND t.account = 'advance'
      AND cast(t.txn_date as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)
    ORDER BY t.txn_date ASC, t.id ASC
  `);
  let advRunning = Number(advTxnOpening?.opening_adv ?? 0);
  const advanceRows = advRows.map(t => {
    advRunning += (t.direction === "credit" ? 1 : -1) * Number(t.amount);
    return {
      id: Number(t.id), reference: t.reference, date: t.date, type: t.type,
      direction: t.direction, amount: Number(t.amount), method: t.method, note: t.note,
      balance: advRunning,
    };
  });

  const availableAdvance = Number(customer.advance_balance ?? 0);
  const advancePaidLifetime = Number(customer.advance_paid_balance ?? 0);

  // Headline "current balance" is the canonical live receivable from the shared
  // engine (matches Receivables report + WhatsApp). closingBalance is the
  // statement balance as of the selected window's end date.
  const receivable = await getCustomerReceivable(db, id);

  res.json({
    customer: {
      id: Number(customer.id), name: customer.name, phone: customer.phone,
      email: customer.email, address: customer.address,
      currentBalance: receivable,
      creditLimit: Number(customer.credit_limit ?? 0),
      advanceBalance: availableAdvance,
      advancePaidBalance: advancePaidLifetime,
    },
    summary: {
      receivable,
      availableAdvance,
      advancePaidLifetime,
      net: receivable - availableAdvance,
    },
    openingBalance, totalDebit, totalCredit, totalReturns, closingBalance, rows,
    advance: { openingBalance: Number(advTxnOpening?.opening_adv ?? 0), rows: advanceRows },
  });
});

// ── Supplier Ledger ────────────────────────────────────────────────────────────

router.get("/ledger/supplier/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid supplier id" }); return; }
  const { startDate, endDate } = dateRange(req);

  const [supplier] = await xr(sql`
    SELECT id, name, company, phone, email,
      cast(balance as decimal(18,2)) as balance,
      cast(advance_balance as decimal(18,2)) as advance_balance,
      cast(advance_paid_balance as decimal(18,2)) as advance_paid_balance
    FROM suppliers WHERE id = ${id}
  `);
  if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }

  // Payable opening = purchase dues − purchase returns + payable transactions, before the window.
  const [[openingData], [openingReturnData], [txnOpening]] = await Promise.all([
    xr(sql`
      SELECT coalesce(sum(cast(due_amount as decimal(18,2))), 0) as opening_balance
      FROM purchases WHERE supplier_id = ${id} AND cast(created_at as date) < cast(${startDate} as date)
    `),
    xr(sql`
      SELECT coalesce(sum(cast(total_amount as decimal(18,2))), 0) as opening_returns
      FROM purchase_returns WHERE supplier_id = ${id} AND cast(created_at as date) < cast(${startDate} as date)
    `),
    xr(sql`
      SELECT coalesce(sum(CASE WHEN direction = 'debit' THEN cast(amount as decimal(18,2)) ELSE -cast(amount as decimal(18,2)) END), 0) as opening_txn
      FROM supplier_transactions
      WHERE supplier_id = ${id} AND account = 'payable'
        AND cast(txn_date as date) < cast(${startDate} as date)
    `),
  ]);

  const [purchases, returns, payTxns] = await Promise.all([
    xr(sql`
      SELECT p.id, p.purchase_number as reference, p.created_at as date,
        'purchase' as type, cast(p.total_amount as decimal(18,2)) as debit, cast(p.paid_amount as decimal(18,2)) as credit,
        NULL as method, NULL as note
      FROM purchases p
      WHERE p.supplier_id = ${id}
        AND cast(p.created_at as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)
    `),
    xr(sql`
      SELECT pr.id, pr.return_number as reference, pr.created_at as date,
        'return' as type, 0 as debit, cast(pr.total_amount as decimal(18,2)) as credit,
        NULL as method, NULL as note
      FROM purchase_returns pr
      WHERE pr.supplier_id = ${id}
        AND cast(pr.created_at as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)
    `),
    // payment_made (credit, reduces payable) and payment_received/adjustment.
    // These are ADDITIONAL to purchases.paid_amount — no double-count.
    xr(sql`
      SELECT t.id, t.reference_no as reference, t.txn_date as date, t.txn_type as type,
        CASE WHEN t.direction = 'debit' THEN cast(t.amount as decimal(18,2)) ELSE 0 END as debit,
        CASE WHEN t.direction = 'credit' THEN cast(t.amount as decimal(18,2)) ELSE 0 END as credit,
        t.payment_method as method, t.note as note
      FROM supplier_transactions t
      WHERE t.supplier_id = ${id} AND t.account = 'payable'
        AND cast(t.txn_date as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)
    `),
  ]);

  const openingBalance = Number(openingData?.opening_balance ?? 0)
    - Number(openingReturnData?.opening_returns ?? 0)
    + Number(txnOpening?.opening_txn ?? 0);

  const allTx = [...purchases, ...returns, ...payTxns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Purchase returns are their OWN column (not lumped into "credit"): a return is
  // goods sent back, not a payment, so it must not inflate the payments/credit
  // total. It still reduces the running balance.
  const { rows, totalDebit, totalCredit, totalReturns, closingBalance } = computeLedgerRows(allTx, openingBalance);

  // Advance sub-ledger (advances we paid the supplier, refunds, applications).
  const [advTxnOpening] = await xr(sql`
    SELECT coalesce(sum(CASE WHEN direction = 'credit' THEN cast(amount as decimal(18,2)) ELSE -cast(amount as decimal(18,2)) END), 0) as opening_adv
    FROM supplier_transactions
    WHERE supplier_id = ${id} AND account = 'advance'
      AND cast(txn_date as date) < cast(${startDate} as date)
  `);
  const advRows = await xr(sql`
    SELECT t.id, t.reference_no as reference, t.txn_date as date, t.txn_type as type,
      t.direction, cast(t.amount as decimal(18,2)) as amount, t.payment_method as method, t.note
    FROM supplier_transactions t
    WHERE t.supplier_id = ${id} AND t.account = 'advance'
      AND cast(t.txn_date as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)
    ORDER BY t.txn_date ASC, t.id ASC
  `);
  let advRunning = Number(advTxnOpening?.opening_adv ?? 0);
  const advanceRows = advRows.map(t => {
    advRunning += (t.direction === "credit" ? 1 : -1) * Number(t.amount);
    return {
      id: Number(t.id), reference: t.reference, date: t.date, type: t.type,
      direction: t.direction, amount: Number(t.amount), method: t.method, note: t.note,
      balance: advRunning,
    };
  });

  const availableAdvance = Number(supplier.advance_balance ?? 0);
  const advancePaidLifetime = Number(supplier.advance_paid_balance ?? 0);

  // Headline "current balance" is the canonical live payable from the shared
  // engine (matches Payables report + WhatsApp). closingBalance is the
  // statement balance as of the selected window's end date.
  const payable = await getSupplierPayable(db, id);

  res.json({
    supplier: {
      id: Number(supplier.id), name: supplier.name, company: supplier.company,
      phone: supplier.phone, email: supplier.email,
      currentBalance: payable,
      advanceBalance: availableAdvance,
      advancePaidBalance: advancePaidLifetime,
    },
    summary: {
      payable,
      availableAdvance,
      advancePaidLifetime,
      net: payable - availableAdvance,
    },
    openingBalance, totalDebit, totalCredit, totalReturns, closingBalance, rows,
    advance: { openingBalance: Number(advTxnOpening?.opening_adv ?? 0), rows: advanceRows },
  });
});

export default router;
