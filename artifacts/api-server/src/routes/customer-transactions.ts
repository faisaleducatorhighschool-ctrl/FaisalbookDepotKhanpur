import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, customerTransactionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { triggerAutomation } from "../lib/whatsapp.js";
import { getCustomerReceivable, customerReceivableSql } from "../lib/accounting.js";

const router = Router();

const TXN_TYPES = ["payment_received", "advance_deposit", "advance_paid", "adjustment"] as const;
type TxnType = (typeof TXN_TYPES)[number];

async function xr(q: ReturnType<typeof sql>): Promise<any[]> {
  const r = (await db.execute(q)) as any;
  if (Array.isArray(r) && Array.isArray(r[0])) return r[0];
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

function dateRange(req: any, defaultDays = 30) {
  const startDate = req.query.startDate || new Date(Date.now() - defaultDays * 86400000).toISOString().slice(0, 10);
  const endDate = req.query.endDate || new Date().toISOString().slice(0, 10);
  return { startDate: String(startDate), endDate: String(endDate) };
}

const PKR = (n: number) => `PKR ${Number(n).toLocaleString("en-PK")}`;

// Reference-number prefix per transaction type. The numeric part is the row id.
const REF_PREFIX: Record<string, string> = {
  payment_received: "RCV",
  advance_deposit: "ADV",
  advance_paid: "APD",
  advance_applied: "APD",
  adjustment: "ADJ",
};

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ── Record a customer transaction (payment / advance / adjustment) ──────────────

router.post("/customers/:id/transactions", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid customer id" }); return; }

  const b = (req.body ?? {}) as Record<string, unknown>;
  const txnType = String(b.txnType ?? "") as TxnType;
  if (!TXN_TYPES.includes(txnType)) { res.status(400).json({ error: `txnType must be one of: ${TXN_TYPES.join(", ")}` }); return; }
  const amountRaw = Number(b.amount);
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) { res.status(400).json({ error: "amount must be a positive number" }); return; }
  // Normalize money to whole cents at the boundary so the smart-split math
  // (applied vs. excess→advance) can never drift by sub-cent fractions.
  const amount = Math.round(amountRaw * 100) / 100;
  const paymentMethod = b.paymentMethod != null ? String(b.paymentMethod) : undefined;
  const bankRef = b.bankRef != null ? String(b.bankRef) : undefined;
  const note = b.note != null ? String(b.note) : undefined;
  const txnDate = b.txnDate != null ? String(b.txnDate) : undefined;
  const bodyDirection = b.direction === "debit" || b.direction === "credit" ? b.direction : undefined;

  let account: "receivable" | "advance";
  let direction: "debit" | "credit";
  if (txnType === "payment_received") { account = "receivable"; direction = "credit"; }
  else if (txnType === "advance_deposit") { account = "advance"; direction = "credit"; }
  else if (txnType === "advance_paid") { account = "advance"; direction = "debit"; }
  else { // adjustment
    account = "receivable";
    if (!bodyDirection) { res.status(400).json({ error: "Adjustment requires a direction (debit increases, credit decreases the amount owed)." }); return; }
    direction = bodyDirection;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const xrt = async (q: ReturnType<typeof sql>): Promise<any[]> => {
        const r = (await tx.execute(q)) as any;
        if (Array.isArray(r) && Array.isArray(r[0])) return r[0];
        return Array.isArray(r) ? r : (r?.rows ?? []);
      };
      // Insert one transaction row and stamp its reference number from the row id.
      const insertTxn = async (
        acc: "receivable" | "advance", tType: string, dir: "debit" | "credit", amt: number, noteText: string | null,
      ): Promise<{ txnId: number; referenceNo: string }> => {
        const [{ id: txnId }] = await tx.insert(customerTransactionsTable).values({
          customerId: id, account: acc, txnType: tType, direction: dir, amount: String(amt.toFixed(2)),
          paymentMethod: paymentMethod ?? "cash", referenceNo: "PENDING",
          bankRef: bankRef ?? null, note: noteText,
          txnDate: txnDate ? new Date(txnDate) : new Date(),
          createdById: req.user?.userId ?? null,
        }).$returningId();
        const ref = `${REF_PREFIX[tType] ?? "TXN"}-${String(txnId).padStart(6, "0")}`;
        await tx.execute(sql`UPDATE customer_transactions SET reference_no = ${ref} WHERE id = ${txnId}`);
        return { txnId, referenceNo: ref };
      };

      // Lock the customer row: advance updates must serialize.
      const [cust] = await xrt(sql`
        SELECT id, name, phone,
          cast(advance_balance as decimal(18,2)) as advance_balance,
          cast(advance_paid_balance as decimal(18,2)) as advance_paid_balance
        FROM customers WHERE id = ${id} FOR UPDATE
      `);
      if (!cust) throw new HttpError(404, "Customer not found");

      let advance = Number(cust.advance_balance);
      let advancePaid = Number(cust.advance_paid_balance);
      const base = {
        customerName: cust.name as string, customerPhone: cust.phone as string,
        appliedToReceivable: 0, advanceCreated: 0,
        paymentReceivedRef: null as string | null, advanceRef: null as string | null,
      };

      // Smart payment: apply to the outstanding receivable FIRST, then auto-save
      // any excess as advance. No manual receivable-vs-advance choice.
      if (txnType === "payment_received") {
        const receivable = await getCustomerReceivable(tx, id);
        const applied = Math.max(0, Math.min(amount, receivable));
        const excess = Math.round((amount - applied) * 100) / 100;
        let primary: { txnId: number; referenceNo: string } | null = null;
        let adv: { txnId: number; referenceNo: string } | null = null;
        if (applied > 0.009) {
          primary = await insertTxn("receivable", "payment_received", "credit", applied, note ?? null);
        }
        if (excess > 0.009) {
          advance += excess;
          await tx.execute(sql`UPDATE customers SET advance_balance = ${String(advance.toFixed(2))} WHERE id = ${id}`);
          const advNote = note ?? (applied > 0.009 ? "Excess over outstanding auto-saved as advance" : "Advance (no outstanding balance)");
          adv = await insertTxn("advance", "advance_deposit", "credit", excess, advNote);
        }
        const main = primary ?? adv!;
        return {
          ...base, advance, advancePaid,
          txnId: main.txnId, referenceNo: main.referenceNo,
          appliedToReceivable: applied, advanceCreated: excess,
          paymentReceivedRef: primary?.referenceNo ?? null, advanceRef: adv?.referenceNo ?? null,
        };
      }

      if (txnType === "advance_deposit") {
        advance += amount;
        await tx.execute(sql`UPDATE customers SET advance_balance = ${String(advance.toFixed(2))} WHERE id = ${id}`);
      } else if (txnType === "advance_paid") {
        if (amount > advance + 0.009) {
          throw new HttpError(400, `Refund of ${PKR(amount)} exceeds the available advance of ${PKR(advance)}.`);
        }
        advance -= amount;
        advancePaid += amount;
        await tx.execute(sql`UPDATE customers SET advance_balance = ${String(advance.toFixed(2))}, advance_paid_balance = ${String(advancePaid.toFixed(2))} WHERE id = ${id}`);
      }
      // adjustment: receivable is live-derived, no column write.

      const { txnId, referenceNo } = await insertTxn(account, txnType, direction, amount, note ?? null);
      return { ...base, advance, advancePaid, txnId, referenceNo };
    });

    // Fire-and-forget WhatsApp (no-op unless a matching active template exists).
    if (txnType === "payment_received" || txnType === "advance_deposit" || txnType === "advance_paid") {
      const balance = await getCustomerReceivable(db, id);
      void triggerAutomation({
        trigger: txnType,
        customerId: id,
        variables: {
          ledger_reference: result.referenceNo,
          amount: PKR(amount),
          transaction_type: txnType,
          payment_method: paymentMethod ?? "cash",
          advance_balance: PKR(result.advance),
          balance: PKR(balance),
        },
      }, req.log);
    }

    res.status(201).json({
      id: result.txnId,
      referenceNo: result.referenceNo,
      customerId: id,
      customerName: result.customerName,
      customerPhone: result.customerPhone,
      account, txnType, direction,
      amount,
      appliedToReceivable: result.appliedToReceivable,
      advanceCreated: result.advanceCreated,
      paymentReceivedRef: result.paymentReceivedRef,
      advanceRef: result.advanceRef,
      paymentMethod: paymentMethod ?? "cash",
      bankRef: bankRef ?? null,
      note: note ?? null,
      txnDate: txnDate ?? new Date().toISOString(),
      advanceBalance: result.advance,
      advancePaidBalance: result.advancePaid,
    });
  } catch (err) {
    if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
    req.log.error({ err }, "createCustomerTransaction failed");
    res.status(500).json({ error: "Failed to record transaction" });
  }
});

// ── Reports ─────────────────────────────────────────────────────────────────────

// Audit list of all customer money movements, filterable.
router.get("/reports/customer-transactions", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req, 90);
  const customerId = req.query.customerId ? Number(req.query.customerId) : null;
  const txnType = req.query.txnType ? String(req.query.txnType) : null;

  const conds = [sql`cast(t.txn_date as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)`];
  if (customerId) conds.push(sql`t.customer_id = ${customerId}`);
  if (txnType) conds.push(sql`t.txn_type = ${txnType}`);
  const where = sql.join(conds, sql` AND `);

  const rows = await xr(sql`
    SELECT t.id, t.reference_no, t.customer_id,
      (SELECT name FROM customers WHERE id = t.customer_id) as customer_name,
      t.account, t.txn_type, t.direction,
      cast(t.amount as decimal(18,2)) as amount,
      t.payment_method, t.bank_ref, t.note, t.txn_date,
      (SELECT name FROM users WHERE id = t.created_by_id) as created_by_name
    FROM customer_transactions t
    WHERE ${where}
    ORDER BY t.txn_date DESC, t.id DESC
  `);

  const totals = { paymentReceived: 0, advanceDeposit: 0, advancePaid: 0, advanceApplied: 0, adjustment: 0 };
  for (const r of rows) {
    const amt = Number(r.amount);
    if (r.txn_type === "payment_received") totals.paymentReceived += amt;
    else if (r.txn_type === "advance_deposit") totals.advanceDeposit += amt;
    else if (r.txn_type === "advance_paid") totals.advancePaid += amt;
    else if (r.txn_type === "advance_applied") totals.advanceApplied += amt;
    else if (r.txn_type === "adjustment") totals.adjustment += amt;
  }

  res.json({
    startDate, endDate, totals,
    rows: rows.map(r => ({
      id: Number(r.id), referenceNo: r.reference_no, customerId: Number(r.customer_id),
      customerName: r.customer_name, account: r.account, txnType: r.txn_type, direction: r.direction,
      amount: Number(r.amount), paymentMethod: r.payment_method, bankRef: r.bank_ref, note: r.note,
      txnDate: r.txn_date, createdByName: r.created_by_name,
    })),
  });
});

// Money collected from customers in the period (payments + advance deposits), by method.
router.get("/reports/customer-collections", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req, 30);

  const rows = await xr(sql`
    SELECT t.id, t.reference_no, t.customer_id,
      (SELECT name FROM customers WHERE id = t.customer_id) as customer_name,
      t.txn_type, t.payment_method, cast(t.amount as decimal(18,2)) as amount, t.txn_date
    FROM customer_transactions t
    WHERE t.txn_type IN ('payment_received','advance_deposit')
      AND cast(t.txn_date as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)
    ORDER BY t.txn_date DESC, t.id DESC
  `);

  const byMethod = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const amt = Number(r.amount);
    total += amt;
    byMethod.set(r.payment_method, (byMethod.get(r.payment_method) ?? 0) + amt);
  }

  res.json({
    startDate, endDate, total,
    byMethod: [...byMethod.entries()].map(([method, amount]) => ({ method, amount })),
    rows: rows.map(r => ({
      id: Number(r.id), referenceNo: r.reference_no, customerId: Number(r.customer_id),
      customerName: r.customer_name, txnType: r.txn_type, paymentMethod: r.payment_method,
      amount: Number(r.amount), txnDate: r.txn_date,
    })),
  });
});

// Customers currently holding an advance / prepaid credit.
router.get("/reports/customer-advances", requireAuth, async (_req, res): Promise<void> => {
  const rows = await xr(sql`
    SELECT id, name, phone,
      cast(advance_balance as decimal(18,2)) as advance_balance,
      cast(advance_paid_balance as decimal(18,2)) as advance_paid_balance
    FROM customers
    WHERE cast(advance_balance as decimal(18,2)) > 0.009
    ORDER BY cast(advance_balance as decimal(18,2)) DESC
  `);
  const totalAdvance = rows.reduce((s, r) => s + Number(r.advance_balance), 0);
  res.json({
    totalAdvance,
    rows: rows.map(r => ({
      id: Number(r.id), name: r.name, phone: r.phone,
      advanceBalance: Number(r.advance_balance), advancePaidBalance: Number(r.advance_paid_balance),
    })),
  });
});

// Per-customer live receivable + advance (those with an open balance either way).
router.get("/reports/customer-outstanding", requireAuth, async (_req, res): Promise<void> => {
  // Receivable comes from the shared canonical expression (single source of truth)
  // so this report can never drift from the ledger / receivables surfaces.
  const rows = await xr(sql`
    SELECT * FROM (
      SELECT c.id AS id, c.name AS name, c.phone AS phone,
        cast(c.advance_balance as decimal(18,2)) AS advance,
        ${customerReceivableSql(sql`c.id`)} AS receivable
      FROM customers c
    ) t
    WHERE t.receivable > 0.009 OR t.advance > 0.009
    ORDER BY t.receivable DESC
  `);
  const totals = rows.reduce((acc, r) => {
    acc.receivable += Number(r.receivable); acc.advance += Number(r.advance); return acc;
  }, { receivable: 0, advance: 0 });
  res.json({
    totals: { ...totals, net: totals.receivable - totals.advance },
    rows: rows.map(r => {
      const receivable = Number(r.receivable);
      const advance = Number(r.advance);
      return { id: Number(r.id), name: r.name, phone: r.phone, receivable, advance, net: receivable - advance };
    }),
  });
});

// Aging of receivables by invoice date, with non-invoice credits applied oldest-first
// so the bucket totals reconcile to each customer's live receivable.
router.get("/reports/customer-aging", requireAuth, async (req, res): Promise<void> => {
  const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();
  const asOfMs = asOf.getTime();

  // Open invoice dues (oldest first per customer).
  const dues = await xr(sql`
    SELECT customer_id, created_at, cast(due_amount as decimal(18,2)) as due
    FROM sales
    WHERE is_return = false AND customer_id IS NOT NULL AND cast(due_amount as decimal(18,2)) > 0.009
    ORDER BY customer_id ASC, created_at ASC, id ASC
  `);

  // Non-invoice credits per customer = payment_received + returns + (adj credit − adj debit).
  const creditRows = await xr(sql`
    SELECT customer_id, sum(amt) as credit FROM (
      SELECT customer_id, cast(amount as decimal(18,2)) as amt
        FROM customer_transactions WHERE account = 'receivable' AND direction = 'credit' AND txn_type <> 'adjustment'
      UNION ALL
      SELECT customer_id, cast(amount as decimal(18,2)) FROM customer_transactions WHERE account = 'receivable' AND txn_type = 'adjustment' AND direction = 'credit'
      UNION ALL
      SELECT customer_id, -cast(amount as decimal(18,2)) FROM customer_transactions WHERE account = 'receivable' AND txn_type = 'adjustment' AND direction = 'debit'
      UNION ALL
      SELECT customer_id, cast(total_amount as decimal(18,2)) FROM sales WHERE is_return = true AND customer_id IS NOT NULL
    ) x
    GROUP BY customer_id
  `);
  const creditByCustomer = new Map<number, number>();
  for (const c of creditRows) creditByCustomer.set(Number(c.customer_id), Number(c.credit));

  const names = await xr(sql`SELECT id, name, phone FROM customers`);
  const nameById = new Map<number, { name: string; phone: string }>();
  for (const n of names) nameById.set(Number(n.id), { name: n.name, phone: n.phone });

  // Group dues per customer and apply credits FIFO (oldest invoices cleared first).
  const perCustomer = new Map<number, { created: number; due: number }[]>();
  for (const d of dues) {
    const cid = Number(d.customer_id);
    if (!perCustomer.has(cid)) perCustomer.set(cid, []);
    perCustomer.get(cid)!.push({ created: new Date(d.created_at).getTime(), due: Number(d.due) });
  }

  const result: any[] = [];
  const totals = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0, total: 0 };
  for (const [cid, invoices] of perCustomer.entries()) {
    let credit = creditByCustomer.get(cid) ?? 0;
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
    let custTotal = 0;
    for (const inv of invoices) {
      let remaining = inv.due;
      if (credit > 0) {
        const applied = Math.min(credit, remaining);
        remaining -= applied; credit -= applied;
      }
      if (remaining <= 0.009) continue;
      const ageDays = Math.floor((asOfMs - inv.created) / 86400000);
      if (ageDays <= 30) buckets.current += remaining;
      else if (ageDays <= 60) buckets.days30 += remaining;
      else if (ageDays <= 90) buckets.days60 += remaining;
      else if (ageDays <= 120) buckets.days90 += remaining;
      else buckets.days90plus += remaining;
      custTotal += remaining;
    }
    if (custTotal <= 0.009) continue;
    const info = nameById.get(cid) ?? { name: `Customer ${cid}`, phone: "" };
    result.push({ id: cid, name: info.name, phone: info.phone, ...buckets, total: custTotal });
    totals.current += buckets.current; totals.days30 += buckets.days30; totals.days60 += buckets.days60;
    totals.days90 += buckets.days90; totals.days90plus += buckets.days90plus; totals.total += custTotal;
  }
  result.sort((a, b) => b.total - a.total);

  res.json({ asOf: asOf.toISOString().slice(0, 10), totals, rows: result });
});

export default router;
