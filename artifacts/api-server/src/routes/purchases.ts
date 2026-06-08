import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, purchasesTable, purchaseItemsTable, purchaseReturnsTable, purchaseReturnItemsTable, inventoryMovementsTable, ledgerEntriesTable } from "@workspace/db";
import { CreatePurchaseBody, UpdatePurchaseBody, UpdatePurchaseParams, GetPurchaseParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

async function xr(q: ReturnType<typeof sql>): Promise<any[]> {
  const r = await db.execute(q) as any;
  // mysql2 returns [rows, fields]; rows is the first element.
  if (Array.isArray(r) && Array.isArray(r[0])) return r[0];
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

class ReturnValidationError extends Error {}

async function getPurchaseWithItems(id: number) {
  const [p] = await db.select({
    id: purchasesTable.id,
    purchaseNumber: purchasesTable.purchaseNumber,
    supplierId: purchasesTable.supplierId,
    supplierName: sql<string | null>`(select name from suppliers where id = purchases.supplier_id)`,
    supplierMobile: sql<string | null>`(select phone from suppliers where id = purchases.supplier_id)`,
    status: purchasesTable.status,
    totalAmount: purchasesTable.totalAmount,
    paidAmount: purchasesTable.paidAmount,
    dueAmount: purchasesTable.dueAmount,
    notes: purchasesTable.notes,
    createdByName: sql<string | null>`(select name from users where id = purchases.created_by_id)`,
    hasReturns: sql<boolean>`exists(select 1 from purchase_returns pr where pr.purchase_id = purchases.id)`,
    createdAt: purchasesTable.createdAt,
  }).from(purchasesTable).where(eq(purchasesTable.id, id));
  if (!p) return null;
  const items = await db.select({
    id: purchaseItemsTable.id,
    productId: purchaseItemsTable.productId,
    productName: sql<string | null>`(select name from products where id = purchase_items.product_id)`,
    quantity: purchaseItemsTable.quantity,
    costPrice: purchaseItemsTable.costPrice,
    returnedQuantity: sql<number>`coalesce((select sum(pri.quantity) from purchase_return_items pri join purchase_returns pr on pr.id = pri.return_id where pr.purchase_id = ${id} and pri.product_id = purchase_items.product_id), 0)`,
  }).from(purchaseItemsTable).where(eq(purchaseItemsTable.purchaseId, id));
  return {
    ...p,
    totalAmount: Number(p.totalAmount), paidAmount: Number(p.paidAmount), dueAmount: Number(p.dueAmount),
    createdAt: p.createdAt.toISOString(),
    items: items.map(i => ({ ...i, costPrice: Number(i.costPrice), returnedQuantity: Number(i.returnedQuantity ?? 0) })),
  };
}

// ── Purchase Returns (MUST come before /:id routes) ───────────────────────────

function validatePurchaseReturnBody(body: any): { data: any; error: string | null } {
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return { data: null, error: "items must be a non-empty array" };
  }
  if (!body.returnReason || !String(body.returnReason).trim()) {
    return { data: null, error: "Return reason is required." };
  }
  for (const it of body.items) {
    if (!Number.isInteger(it.productId) || it.productId <= 0) return { data: null, error: "each item must have a valid productId" };
    if (!Number.isInteger(it.quantity) || it.quantity < 1) return { data: null, error: "each item quantity must be >= 1" };
    if (typeof it.costPrice !== "number" || it.costPrice < 0) return { data: null, error: "each item costPrice must be >= 0" };
  }
  return {
    data: {
      purchaseId: body.purchaseId ? Number(body.purchaseId) : undefined,
      supplierId: body.supplierId ? Number(body.supplierId) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      returnReason: String(body.returnReason),
      items: body.items.map((it: any) => ({ productId: Number(it.productId), quantity: Number(it.quantity), costPrice: Number(it.costPrice) })),
    },
    error: null,
  };
}

router.get("/purchases/returns", requireAuth, async (_req, res): Promise<void> => {
  const rows = await xr(sql`
    SELECT
      pr.id, pr.return_number, pr.purchase_id, pr.supplier_id,
      cast(pr.total_amount as decimal(18,2)) as total_amount, pr.notes, pr.return_reason, pr.created_at,
      (select name from suppliers where id = pr.supplier_id) as supplier_name,
      (select purchase_number from purchases where id = pr.purchase_id) as purchase_number,
      (
        SELECT json_arrayagg(json_object(
          'productName', (select name from products where id = pri.product_id),
          'productId', pri.product_id, 'quantity', pri.quantity,
          'costPrice', cast(pri.cost_price as decimal(18,2))
        ))
        FROM purchase_return_items pri WHERE pri.return_id = pr.id
      ) as items
    FROM purchase_returns pr
    ORDER BY pr.created_at DESC
  `);
  res.json(rows.map(r => ({
    id: Number(r.id), returnNumber: r.return_number,
    purchaseId: r.purchase_id ? Number(r.purchase_id) : null,
    supplierId: r.supplier_id ? Number(r.supplier_id) : null,
    supplierName: r.supplier_name ?? null,
    purchaseNumber: r.purchase_number ?? null,
    totalAmount: Number(r.total_amount),
    notes: r.notes, returnReason: r.return_reason ?? null, createdAt: r.created_at,
    items: typeof r.items === "string" ? JSON.parse(r.items) : (r.items ?? []),
  })));
});

router.post("/purchases/returns", requireAuth, async (req, res): Promise<void> => {
  const parsed = validatePurchaseReturnBody(req.body);
  if (parsed.error) { res.status(400).json({ error: parsed.error }); return; }
  const { purchaseId, supplierId, notes, returnReason, items } = parsed.data;

  type ReturnItem = { productId: number; quantity: number; costPrice: number };
  const lineItems = items as ReturnItem[];

  // Aggregate requested quantity per product so multiple lines for the same
  // product can't each pass validation individually and exceed the cap together.
  const qtyByProduct = new Map<number, number>();
  for (const it of lineItems) {
    qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + it.quantity);
  }
  // Lock rows in a deterministic (sorted) product order so concurrent returns
  // touching the same products can't deadlock by locking in opposite orders.
  const productOrder = [...qtyByProduct.entries()].sort((a, b) => a[0] - b[0]);

  const total = lineItems.reduce((s, i) => s + i.costPrice * i.quantity, 0);
  const returnNumber = `PR-${Date.now()}`;

  try {
    // Validate + insert + decrement stock atomically. Locking each product row
    // (FOR UPDATE) serializes concurrent returns so stale reads can't over-return.
    const ret = await db.transaction(async (tx) => {
      const xrt = async (q: ReturnType<typeof sql>): Promise<any[]> => {
        const r = (await tx.execute(q)) as any;
        // mysql2 returns [rows, fields]; rows is the first element.
        if (Array.isArray(r) && Array.isArray(r[0])) return r[0];
        return Array.isArray(r) ? r : (r?.rows ?? []);
      };

      for (const [productId, wantQty] of productOrder) {
        const [prod] = await xrt(sql`SELECT stock, name FROM products WHERE id = ${productId} FOR UPDATE`);
        const currentStock = Number(prod?.stock ?? 0);
        const prodName = (prod?.name as string | undefined) ?? `product ${productId}`;
        let maxReturn = currentStock;

        if (purchaseId) {
          const [orig] = await xrt(sql`
            SELECT coalesce(sum(quantity), 0) as orig_qty FROM purchase_items
            WHERE purchase_id = ${purchaseId} AND product_id = ${productId}
          `);
          const [already] = await xrt(sql`
            SELECT coalesce(sum(pri.quantity), 0) as returned_qty
            FROM purchase_return_items pri
            JOIN purchase_returns pr ON pr.id = pri.return_id
            WHERE pr.purchase_id = ${purchaseId} AND pri.product_id = ${productId}
          `);
          const poRemaining = Number(orig?.orig_qty ?? 0) - Number(already?.returned_qty ?? 0);
          // Can't return more than what was bought on this PO, nor more than is
          // still physically in stock (sold units are no longer available).
          maxReturn = Math.min(poRemaining, currentStock);
        }

        if (wantQty > maxReturn) {
          throw new ReturnValidationError(
            `Cannot return ${wantQty} of "${prodName}": only ${maxReturn} available in stock${purchaseId ? " for this PO (sold units can't be returned)" : ""}.`,
          );
        }
      }

      // For PO-linked returns the supplier is authoritative from the purchase
      // record — never trust a client-supplied supplierId that could post the
      // ledger impact to the wrong supplier.
      let effectiveSupplierId: number | null = supplierId ?? null;
      if (purchaseId) {
        const [po] = await xrt(sql`SELECT supplier_id FROM purchases WHERE id = ${purchaseId}`);
        effectiveSupplierId = po?.supplier_id != null ? Number(po.supplier_id) : null;
      }

      const [{ id: createdId }] = await tx.insert(purchaseReturnsTable).values({
        returnNumber,
        purchaseId: purchaseId ?? null,
        supplierId: effectiveSupplierId,
        totalAmount: String(total),
        notes: notes ?? null,
        returnReason: returnReason ?? null,
      }).$returningId();
      const [created] = await tx.select().from(purchaseReturnsTable).where(eq(purchaseReturnsTable.id, createdId));

      await tx.insert(purchaseReturnItemsTable).values(lineItems.map((i) => ({
        returnId: created.id,
        productId: i.productId,
        quantity: i.quantity,
        costPrice: String(i.costPrice),
      })));

      for (const [productId, wantQty] of productOrder) {
        await tx.execute(sql`UPDATE products SET stock = GREATEST(0, stock - ${wantQty}) WHERE id = ${productId}`);
      }

      // Record a stock movement per product so the Stock Movements report and
      // inventory history reflect the supplier return immediately.
      await tx.insert(inventoryMovementsTable).values(
        productOrder.map(([productId, wantQty]) => ({
          productId,
          type: "stock_out",
          quantity: wantQty,
          notes: `Supplier return ${returnNumber}${returnReason ? ` (${returnReason})` : ""}`,
        })),
      );

      // Post a supplier ledger entry so the supplier balance reflects the return.
      // A return reduces what we owe the supplier (a debit against the payable),
      // so it lowers the running balance carried from the supplier's last entry.
      if (effectiveSupplierId) {
        // Serialize ledger writes per supplier: lock the supplier row so two
        // concurrent returns (e.g. for different products of the same supplier)
        // can't both read the same prior balance and clobber the running chain.
        await xrt(sql`SELECT id FROM suppliers WHERE id = ${effectiveSupplierId} FOR UPDATE`);
        const [last] = await xrt(sql`
          SELECT cast(balance as decimal(18,2)) as balance FROM ledger_entries
          WHERE entity_type = 'supplier' AND entity_id = ${effectiveSupplierId}
          ORDER BY created_at DESC, id DESC LIMIT 1
        `);
        const prevBalance = Number(last?.balance ?? 0);
        const newBalance = prevBalance - total;
        await tx.insert(ledgerEntriesTable).values({
          entityType: "supplier",
          entityId: effectiveSupplierId,
          type: "debit",
          amount: String(total),
          balance: String(newBalance),
          description: `Purchase return ${returnNumber}${returnReason ? ` — ${returnReason}` : ""}`,
          referenceId: created.id,
        });
      }

      return created;
    });

    res.status(201).json({
      id: ret.id, returnNumber: ret.returnNumber,
      purchaseId: ret.purchaseId, supplierId: ret.supplierId,
      totalAmount: Number(ret.totalAmount), notes: ret.notes,
      returnReason: ret.returnReason ?? null,
      createdAt: ret.createdAt, items: lineItems,
    });
  } catch (e) {
    if (e instanceof ReturnValidationError) { res.status(400).json({ error: e.message }); return; }
    // MySQL deadlock (ER_LOCK_DEADLOCK / errno 1213) or lock-wait timeout
    // (ER_LOCK_WAIT_TIMEOUT / errno 1205): another return touched the same
    // products at the same time. Safe to retry.
    const err = e as { code?: string; errno?: number } | null;
    if (err?.code === "ER_LOCK_DEADLOCK" || err?.code === "ER_LOCK_WAIT_TIMEOUT" || err?.errno === 1213 || err?.errno === 1205) {
      res.status(409).json({ error: "Another return is processing these products. Please try again." });
      return;
    }
    throw e;
  }
});

// ── Purchases CRUD ─────────────────────────────────────────────────────────────

router.get("/purchases", requireAuth, async (req, res): Promise<void> => {
  const q = req.query as Record<string, string | undefined>;
  const parsedLimit = q.limit ? Number(q.limit) : NaN;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 5000) : 500;

  const conditions = [];
  if (q.date) conditions.push(sql`cast(${purchasesTable.createdAt} as date) = cast(${String(q.date)} as date)`);
  if (q.startDate) conditions.push(sql`cast(${purchasesTable.createdAt} as date) >= cast(${String(q.startDate)} as date)`);
  if (q.endDate) conditions.push(sql`cast(${purchasesTable.createdAt} as date) <= cast(${String(q.endDate)} as date)`);
  if (q.purchaseNumber) conditions.push(sql`${purchasesTable.purchaseNumber} LIKE ${"%" + String(q.purchaseNumber) + "%"}`);
  if (q.supplierName) conditions.push(sql`(select name from suppliers where id = purchases.supplier_id) LIKE ${"%" + String(q.supplierName) + "%"}`);
  if (q.supplierMobile) conditions.push(sql`(select phone from suppliers where id = purchases.supplier_id) LIKE ${"%" + String(q.supplierMobile) + "%"}`);
  if (q.productName) conditions.push(sql`exists(select 1 from purchase_items pi join products p on p.id = pi.product_id where pi.purchase_id = purchases.id and p.name LIKE ${"%" + String(q.productName) + "%"})`);
  const where = conditions.length ? sql.join(conditions, sql` AND `) : undefined;

  const purchases = await db.select({
    id: purchasesTable.id,
    purchaseNumber: purchasesTable.purchaseNumber,
    supplierId: purchasesTable.supplierId,
    supplierName: sql<string | null>`(select name from suppliers where id = purchases.supplier_id)`,
    supplierMobile: sql<string | null>`(select phone from suppliers where id = purchases.supplier_id)`,
    status: purchasesTable.status,
    totalAmount: purchasesTable.totalAmount,
    paidAmount: purchasesTable.paidAmount,
    dueAmount: purchasesTable.dueAmount,
    notes: purchasesTable.notes,
    createdByName: sql<string | null>`(select name from users where id = purchases.created_by_id)`,
    hasReturns: sql<boolean>`exists(select 1 from purchase_returns pr where pr.purchase_id = purchases.id)`,
    createdAt: purchasesTable.createdAt,
  }).from(purchasesTable).where(where).orderBy(sql`created_at desc`).limit(limit);
  res.json(purchases.map(p => ({
    ...p, totalAmount: Number(p.totalAmount), paidAmount: Number(p.paidAmount), dueAmount: Number(p.dueAmount),
    createdAt: p.createdAt.toISOString(), items: [],
  })));
});

router.post("/purchases", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePurchaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { supplierId, notes, paidAmount, items } = parsed.data;
  const total = items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
  const due = total - (paidAmount ?? 0);
  const purchaseNumber = `PO-${Date.now()}`;

  try {
    // The purchase, its line items, stock movements, AND any supplier-advance
    // auto-application are committed in ONE atomic transaction. Money flow can
    // never partially commit: if advance application fails, the whole purchase
    // rolls back rather than leaving stock/dues in an inconsistent state.
    const newPurchaseId = await db.transaction(async (tx) => {
      const [{ id: createdId }] = await tx.insert(purchasesTable).values({
        purchaseNumber, supplierId, notes: notes ?? null,
        totalAmount: String(total), paidAmount: String(paidAmount ?? 0), dueAmount: String(due),
        status: "received", createdById: req.user?.userId ?? null,
      }).$returningId();
      await tx.insert(purchaseItemsTable).values(items.map(i => ({
        purchaseId: createdId, productId: i.productId, quantity: i.quantity, costPrice: String(i.costPrice),
      })));
      for (const item of items) {
        await tx.execute(sql`UPDATE products SET stock = stock + ${item.quantity} WHERE id = ${item.productId}`);
      }

      // Auto-apply any advance we are holding with this supplier against the new
      // due. Lock the supplier row so concurrent purchases can't both spend the
      // same advance.
      if (due > 0.009) {
        const r = (await tx.execute(sql`SELECT cast(advance_balance as decimal(18,2)) as adv, cast(advance_paid_balance as decimal(18,2)) as paid FROM suppliers WHERE id = ${supplierId} FOR UPDATE`)) as any;
        const row = Array.isArray(r) && Array.isArray(r[0]) ? r[0][0] : (Array.isArray(r) ? r[0] : r?.rows?.[0]);
        const advance = Number(row?.adv ?? 0);
        const apply = Math.min(advance, due);
        if (apply > 0.009) {
          await tx.execute(sql`UPDATE purchases SET paid_amount = cast(paid_amount as decimal(18,2)) + ${String(apply.toFixed(2))}, due_amount = cast(due_amount as decimal(18,2)) - ${String(apply.toFixed(2))} WHERE id = ${createdId}`);
          await tx.execute(sql`UPDATE suppliers SET advance_balance = cast(advance_balance as decimal(18,2)) - ${String(apply.toFixed(2))}, advance_paid_balance = cast(advance_paid_balance as decimal(18,2)) + ${String(apply.toFixed(2))} WHERE id = ${supplierId}`);
          const ins = (await tx.execute(sql`INSERT INTO supplier_transactions (supplier_id, account, txn_type, direction, amount, payment_method, reference_no, note, txn_date, created_by_id) VALUES (${supplierId}, 'advance', 'advance_applied', 'debit', ${String(apply.toFixed(2))}, 'advance', 'PENDING', ${`Applied to purchase ${purchaseNumber}`}, NOW(), ${req.user?.userId ?? null})`)) as any;
          const newId = Array.isArray(ins) ? (ins[0]?.insertId ?? (ins[0] as any)?.[0]?.insertId) : ins?.insertId;
          if (newId) await tx.execute(sql`UPDATE supplier_transactions SET reference_no = ${`SAP-${String(newId).padStart(6, "0")}`} WHERE id = ${newId}`);
        }
      }
      return createdId;
    });

    const result = await getPurchaseWithItems(newPurchaseId);
    res.status(201).json(result);
  } catch (e) {
    // MySQL deadlock (ER_LOCK_DEADLOCK / errno 1213) or lock-wait timeout
    // (ER_LOCK_WAIT_TIMEOUT / errno 1205): another purchase/payment touched the
    // same supplier advance concurrently. Safe to retry.
    const err = e as { code?: string; errno?: number } | null;
    if (err?.code === "ER_LOCK_DEADLOCK" || err?.code === "ER_LOCK_WAIT_TIMEOUT" || err?.errno === 1213 || err?.errno === 1205) {
      res.status(409).json({ error: "Another transaction is updating this supplier. Please try again." });
      return;
    }
    throw e;
  }
});

router.get("/purchases/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPurchaseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const p = await getPurchaseWithItems(params.data.id);
  if (!p) { res.status(404).json({ error: "Purchase not found" }); return; }
  res.json(p);
});

router.patch("/purchases/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePurchaseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePurchaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const upd: Record<string, unknown> = {};
  if (parsed.data.status) upd.status = parsed.data.status;
  if (parsed.data.notes !== undefined) upd.notes = parsed.data.notes;
  if (parsed.data.paidAmount !== undefined) upd.paidAmount = String(parsed.data.paidAmount);
  await db.update(purchasesTable).set(upd).where(eq(purchasesTable.id, params.data.id));
  const result = await getPurchaseWithItems(params.data.id);
  if (!result) { res.status(404).json({ error: "Purchase not found" }); return; }
  res.json(result);
});

export default router;
