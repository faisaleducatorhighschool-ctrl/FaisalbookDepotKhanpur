import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, supplierTransactionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { triggerSupplierAutomation } from "../lib/whatsapp.js";
import { getSupplierPayable, supplierPayableSql } from "../lib/accounting.js";

const router = Router();

// payable: payment_made (credit, reduces what we owe), payment_received (debit,
//   supplier pays us back), adjustment (manual, directional)
// advance: advance_paid (credit, advance we give the supplier), advance_received
//   / supplier_refund / advance_applied (debit, reduces the advance we hold)
const TXN_TYPES = [
  "payment_made", "payment_received", "advance_paid",
  "advance_received", "supplier_refund", "advance_applied", "adjustment",
] as const;
type TxnType = (typeof TXN_TYPES)[number];

const ADVANCE_DEBIT_TYPES = new Set<TxnType>(["advance_received", "supplier_refund", "advance_applied"]);

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

const REF_PREFIX: Record<string, string> = {
  payment_made: "PAY",
  payment_received: "PRC",
  advance_paid: "SAD",
  advance_received: "SAR",
  supplier_refund: "SRF",
  advance_applied: "SAP",
  adjustment: "SAJ",
};

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ── Record a supplier transaction (payment / advance / adjustment) ──────────────

router.post("/suppliers/:id/transactions", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid supplier id" }); return; }

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

  let account: "payable" | "advance";
  let direction: "debit" | "credit";
  if (txnType === "payment_made") { account = "payable"; direction = "credit"; }
  else if (txnType === "payment_received") { account = "payable"; direction = "debit"; }
  else if (txnType === "advance_paid") { account = "advance"; direction = "credit"; }
  else if (ADVANCE_DEBIT_TYPES.has(txnType)) { account = "advance"; direction = "debit"; }
  else { // adjustment
    account = "payable";
    if (!bodyDirection) { res.status(400).json({ error: "Adjustment requires a direction (debit increases, credit decreases what we owe)." }); return; }
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
        acc: "payable" | "advance", tType: string, dir: "debit" | "credit", amt: number, noteText: string | null,
      ): Promise<{ txnId: number; referenceNo: string }> => {
        const [{ id: txnId }] = await tx.insert(supplierTransactionsTable).values({
          supplierId: id, account: acc, txnType: tType, direction: dir, amount: String(amt.toFixed(2)),
          paymentMethod: paymentMethod ?? "cash", referenceNo: "PENDING",
          bankRef: bankRef ?? null, note: noteText,
          txnDate: txnDate ? new Date(txnDate) : new Date(),
          createdById: req.user?.userId ?? null,
        }).$returningId();
        const ref = `${REF_PREFIX[tType] ?? "STX"}-${String(txnId).padStart(6, "0")}`;
        await tx.execute(sql`UPDATE supplier_transactions SET reference_no = ${ref} WHERE id = ${txnId}`);
        return { txnId, referenceNo: ref };
      };

      // Lock the supplier row: advance updates must serialize.
      const [sup] = await xrt(sql`
        SELECT id, name, phone,
          cast(advance_balance as decimal(18,2)) as advance_balance,
          cast(advance_paid_balance as decimal(18,2)) as advance_paid_balance
        FROM suppliers WHERE id = ${id} FOR UPDATE
      `);
      if (!sup) throw new HttpError(404, "Supplier not found");

      let advance = Number(sup.advance_balance);
      let advancePaid = Number(sup.advance_paid_balance);
      const base = {
        supplierName: sup.name as string, supplierPhone: sup.phone as string,
        appliedToPayable: 0, advanceCreated: 0,
        paymentMadeRef: null as string | null, advanceRef: null as string | null,
      };

      // Smart payment: settle the outstanding payable FIRST, then auto-save any
      // excess as a supplier advance. No manual payable-vs-advance choice.
      if (txnType === "payment_made") {
        const payable = await getSupplierPayable(tx, id);
        const applied = Math.max(0, Math.min(amount, payable));
        const excess = Math.round((amount - applied) * 100) / 100;
        let primary: { txnId: number; referenceNo: string } | null = null;
        let adv: { txnId: number; referenceNo: string } | null = null;
        if (applied > 0.009) {
          primary = await insertTxn("payable", "payment_made", "credit", applied, note ?? null);
        }
        if (excess > 0.009) {
          advance += excess;
          await tx.execute(sql`UPDATE suppliers SET advance_balance = ${String(advance.toFixed(2))} WHERE id = ${id}`);
          const advNote = note ?? (applied > 0.009 ? "Excess over outstanding auto-saved as supplier advance" : "Advance to supplier (no outstanding balance)");
          adv = await insertTxn("advance", "advance_paid", "credit", excess, advNote);
        }
        const main = primary ?? adv!;
        return {
          ...base, advance, advancePaid,
          txnId: main.txnId, referenceNo: main.referenceNo,
          appliedToPayable: applied, advanceCreated: excess,
          paymentMadeRef: primary?.referenceNo ?? null, advanceRef: adv?.referenceNo ?? null,
        };
      }

      if (txnType === "advance_paid") {
        advance += amount;
        await tx.execute(sql`UPDATE suppliers SET advance_balance = ${String(advance.toFixed(2))} WHERE id = ${id}`);
      } else if (ADVANCE_DEBIT_TYPES.has(txnType)) {
        if (amount > advance + 0.009) {
          throw new HttpError(400, `${PKR(amount)} exceeds the available supplier advance of ${PKR(advance)}.`);
        }
        advance -= amount;
        advancePaid += amount;
        await tx.execute(sql`UPDATE suppliers SET advance_balance = ${String(advance.toFixed(2))}, advance_paid_balance = ${String(advancePaid.toFixed(2))} WHERE id = ${id}`);
      }
      // payment_received / adjustment: payable is live-derived, no column write.

      const { txnId, referenceNo } = await insertTxn(account, txnType, direction, amount, note ?? null);
      return { ...base, advance, advancePaid, txnId, referenceNo };
    });

    // Fire-and-forget WhatsApp (no-op unless a matching active template exists).
    if (txnType === "payment_made" || txnType === "advance_paid") {
      // Outstanding payable (live-derived) for balance-bearing templates.
      const balance = await getSupplierPayable(db, id);
      void triggerSupplierAutomation({
        trigger: `supplier_${txnType}`,
        supplierId: id,
        variables: {
          ledger_reference: result.referenceNo,
          invoice_no: result.referenceNo,
          amount: PKR(amount),
          transaction_type: txnType,
          balance: PKR(balance),
          advance_balance: PKR(result.advance),
          payment_method: paymentMethod ?? "cash",
          user: (req.user as any)?.name ?? "",
        },
      }, req.log);
    }

    res.status(201).json({
      id: result.txnId,
      referenceNo: result.referenceNo,
      supplierId: id,
      supplierName: result.supplierName,
      supplierPhone: result.supplierPhone,
      account, txnType, direction,
      amount,
      appliedToPayable: result.appliedToPayable,
      advanceCreated: result.advanceCreated,
      paymentMadeRef: result.paymentMadeRef,
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
    req.log.error({ err }, "createSupplierTransaction failed");
    res.status(500).json({ error: "Failed to record transaction" });
  }
});

// ── Reports ─────────────────────────────────────────────────────────────────────

// Audit list of all supplier money movements, filterable.
router.get("/reports/supplier-transactions", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req, 90);
  const supplierId = req.query.supplierId ? Number(req.query.supplierId) : null;
  const txnType = req.query.txnType ? String(req.query.txnType) : null;

  const conds = [sql`cast(t.txn_date as date) BETWEEN cast(${startDate} as date) AND cast(${endDate} as date)`];
  if (supplierId) conds.push(sql`t.supplier_id = ${supplierId}`);
  if (txnType) conds.push(sql`t.txn_type = ${txnType}`);
  const where = sql.join(conds, sql` AND `);

  const rows = await xr(sql`
    SELECT t.id, t.reference_no, t.supplier_id,
      (SELECT name FROM suppliers WHERE id = t.supplier_id) as supplier_name,
      t.account, t.txn_type, t.direction,
      cast(t.amount as decimal(18,2)) as amount,
      t.payment_method, t.bank_ref, t.note, t.txn_date,
      (SELECT name FROM users WHERE id = t.created_by_id) as created_by_name
    FROM supplier_transactions t
    WHERE ${where}
    ORDER BY t.txn_date DESC, t.id DESC
  `);

  const totals = { paymentMade: 0, paymentReceived: 0, advancePaid: 0, advanceReceived: 0, supplierRefund: 0, advanceApplied: 0, adjustment: 0 };
  for (const r of rows) {
    const amt = Number(r.amount);
    if (r.txn_type === "payment_made") totals.paymentMade += amt;
    else if (r.txn_type === "payment_received") totals.paymentReceived += amt;
    else if (r.txn_type === "advance_paid") totals.advancePaid += amt;
    else if (r.txn_type === "advance_received") totals.advanceReceived += amt;
    else if (r.txn_type === "supplier_refund") totals.supplierRefund += amt;
    else if (r.txn_type === "advance_applied") totals.advanceApplied += amt;
    else if (r.txn_type === "adjustment") totals.adjustment += amt;
  }

  res.json({
    startDate, endDate, totals,
    rows: rows.map(r => ({
      id: Number(r.id), referenceNo: r.reference_no, supplierId: Number(r.supplier_id),
      supplierName: r.supplier_name, account: r.account, txnType: r.txn_type, direction: r.direction,
      amount: Number(r.amount), paymentMethod: r.payment_method, bankRef: r.bank_ref, note: r.note,
      txnDate: r.txn_date, createdByName: r.created_by_name,
    })),
  });
});

// Money paid to suppliers in the period (payments + advances), by method.
router.get("/reports/supplier-payments", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req, 30);

  const rows = await xr(sql`
    SELECT t.id, t.reference_no, t.supplier_id,
      (SELECT name FROM suppliers WHERE id = t.supplier_id) as supplier_name,
      t.txn_type, t.payment_method, cast(t.amount as decimal(18,2)) as amount, t.txn_date
    FROM supplier_transactions t
    WHERE t.txn_type IN ('payment_made','advance_paid')
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
      id: Number(r.id), referenceNo: r.reference_no, supplierId: Number(r.supplier_id),
      supplierName: r.supplier_name, txnType: r.txn_type, paymentMethod: r.payment_method,
      amount: Number(r.amount), txnDate: r.txn_date,
    })),
  });
});

// Suppliers we are currently holding an advance with (prepaid credit).
router.get("/reports/supplier-advances", requireAuth, async (_req, res): Promise<void> => {
  const rows = await xr(sql`
    SELECT id, name, phone,
      cast(advance_balance as decimal(18,2)) as advance_balance,
      cast(advance_paid_balance as decimal(18,2)) as advance_paid_balance
    FROM suppliers
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

// Per-supplier live payable + advance (those with an open balance either way).
// Payable = purchase dues − purchase returns + (payment_made − payment_received)
//           + (adjustment credit − adjustment debit).
router.get("/reports/supplier-outstanding", requireAuth, async (_req, res): Promise<void> => {
  // Payable comes from the shared canonical expression (single source of truth)
  // so this report can never drift from the ledger / payables surfaces.
  const rows = await xr(sql`
    SELECT * FROM (
      SELECT s.id AS id, s.name AS name, s.phone AS phone,
        cast(s.advance_balance as decimal(18,2)) AS advance,
        ${supplierPayableSql(sql`s.id`)} AS payable
      FROM suppliers s
    ) t
    WHERE t.payable > 0.009 OR t.advance > 0.009
    ORDER BY t.payable DESC
  `);
  const totals = rows.reduce((acc, r) => {
    acc.payable += Number(r.payable); acc.advance += Number(r.advance); return acc;
  }, { payable: 0, advance: 0 });
  res.json({
    totals: { ...totals, net: totals.payable - totals.advance },
    rows: rows.map(r => {
      const payable = Number(r.payable);
      const advance = Number(r.advance);
      return { id: Number(r.id), name: r.name, phone: r.phone, payable, advance, net: payable - advance };
    }),
  });
});

export default router;
