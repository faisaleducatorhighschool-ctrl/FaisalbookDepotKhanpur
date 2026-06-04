import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, purchasesTable, purchaseItemsTable, purchaseReturnsTable, purchaseReturnItemsTable } from "@workspace/db";
import { CreatePurchaseBody, UpdatePurchaseBody, UpdatePurchaseParams, GetPurchaseParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

async function xr(q: ReturnType<typeof sql>): Promise<any[]> {
  const r = await db.execute(q) as any;
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

async function getPurchaseWithItems(id: number) {
  const [p] = await db.select({
    id: purchasesTable.id,
    purchaseNumber: purchasesTable.purchaseNumber,
    supplierId: purchasesTable.supplierId,
    supplierName: sql<string | null>`(select name from suppliers where id = purchases.supplier_id)`,
    status: purchasesTable.status,
    totalAmount: purchasesTable.totalAmount,
    paidAmount: purchasesTable.paidAmount,
    dueAmount: purchasesTable.dueAmount,
    notes: purchasesTable.notes,
    createdAt: purchasesTable.createdAt,
  }).from(purchasesTable).where(eq(purchasesTable.id, id));
  if (!p) return null;
  const items = await db.select({
    id: purchaseItemsTable.id,
    productId: purchaseItemsTable.productId,
    productName: sql<string | null>`(select name from products where id = purchase_items.product_id)`,
    quantity: purchaseItemsTable.quantity,
    costPrice: purchaseItemsTable.costPrice,
  }).from(purchaseItemsTable).where(eq(purchaseItemsTable.purchaseId, id));
  return {
    ...p,
    totalAmount: Number(p.totalAmount), paidAmount: Number(p.paidAmount), dueAmount: Number(p.dueAmount),
    createdAt: p.createdAt.toISOString(),
    items: items.map(i => ({ ...i, costPrice: Number(i.costPrice) })),
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
      pr.total_amount::numeric as total_amount, pr.notes, pr.return_reason, pr.created_at,
      (select name from suppliers where id = pr.supplier_id) as supplier_name,
      (select purchase_number from purchases where id = pr.purchase_id) as purchase_number,
      (
        SELECT json_agg(json_build_object(
          'productName', (select name from products where id = pri.product_id),
          'productId', pri.product_id, 'quantity', pri.quantity,
          'costPrice', pri.cost_price::numeric
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
    notes: r.notes, returnReason: r.return_reason ?? null, createdAt: r.created_at, items: r.items ?? [],
  })));
});

router.post("/purchases/returns", requireAuth, async (req, res): Promise<void> => {
  const parsed = validatePurchaseReturnBody(req.body);
  if (parsed.error) { res.status(400).json({ error: parsed.error }); return; }
  const { purchaseId, supplierId, notes, returnReason, items } = parsed.data;

  if (purchaseId) {
    for (const item of items) {
      const [orig] = await xr(sql`
        SELECT coalesce(sum(quantity), 0) as orig_qty FROM purchase_items
        WHERE purchase_id = ${purchaseId} AND product_id = ${item.productId}
      `);
      const [already] = await xr(sql`
        SELECT coalesce(sum(pri.quantity), 0) as returned_qty
        FROM purchase_return_items pri
        JOIN purchase_returns pr ON pr.id = pri.return_id
        WHERE pr.purchase_id = ${purchaseId} AND pri.product_id = ${item.productId}
      `);
      const maxReturn = Number(orig?.orig_qty ?? 0) - Number(already?.returned_qty ?? 0);
      if (item.quantity > maxReturn) {
        res.status(400).json({ error: `Return qty for product ${item.productId} exceeds available (max: ${maxReturn})` });
        return;
      }
    }
  }

  type ReturnItem = { productId: number; quantity: number; costPrice: number };
  const total = (items as ReturnItem[]).reduce((s: number, i: ReturnItem) => s + i.costPrice * i.quantity, 0);
  const returnNumber = `PR-${Date.now()}`;

  const [ret] = await db.insert(purchaseReturnsTable).values({
    returnNumber,
    purchaseId: purchaseId ?? null,
    supplierId: supplierId ?? null,
    totalAmount: String(total),
    notes: notes ?? null,
    returnReason: returnReason ?? null,
  }).returning();

  await db.insert(purchaseReturnItemsTable).values((items as ReturnItem[]).map((i: ReturnItem) => ({
    returnId: ret.id,
    productId: i.productId,
    quantity: i.quantity,
    costPrice: String(i.costPrice),
  })));

  for (const item of items) {
    await db.execute(sql`UPDATE products SET stock = GREATEST(0, stock - ${item.quantity}) WHERE id = ${item.productId}`);
  }

  res.status(201).json({
    id: ret.id, returnNumber: ret.returnNumber,
    purchaseId: ret.purchaseId, supplierId: ret.supplierId,
    totalAmount: Number(ret.totalAmount), notes: ret.notes,
    returnReason: ret.returnReason ?? null,
    createdAt: ret.createdAt, items,
  });
});

// ── Purchases CRUD ─────────────────────────────────────────────────────────────

router.get("/purchases", requireAuth, async (_req, res): Promise<void> => {
  const purchases = await db.select({
    id: purchasesTable.id,
    purchaseNumber: purchasesTable.purchaseNumber,
    supplierId: purchasesTable.supplierId,
    supplierName: sql<string | null>`(select name from suppliers where id = purchases.supplier_id)`,
    status: purchasesTable.status,
    totalAmount: purchasesTable.totalAmount,
    paidAmount: purchasesTable.paidAmount,
    dueAmount: purchasesTable.dueAmount,
    notes: purchasesTable.notes,
    createdAt: purchasesTable.createdAt,
  }).from(purchasesTable).orderBy(sql`created_at desc`);
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
  const [purchase] = await db.insert(purchasesTable).values({
    purchaseNumber, supplierId, notes: notes ?? null,
    totalAmount: String(total), paidAmount: String(paidAmount ?? 0), dueAmount: String(due),
    status: "received",
  }).returning();
  await db.insert(purchaseItemsTable).values(items.map(i => ({
    purchaseId: purchase.id, productId: i.productId, quantity: i.quantity, costPrice: String(i.costPrice),
  })));
  for (const item of items) {
    await db.execute(sql`UPDATE products SET stock = stock + ${item.quantity} WHERE id = ${item.productId}`);
  }
  const result = await getPurchaseWithItems(purchase.id);
  res.status(201).json(result);
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
