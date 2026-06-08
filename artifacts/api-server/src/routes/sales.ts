import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable } from "@workspace/db";
import { CreateSaleBody, GetSaleParams, ListSalesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";
import { triggerAutomation } from "../lib/whatsapp.js";

const PKR = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

const router = Router();

async function getSaleWithItems(id: number) {
  const [s] = await db.select({
    id: salesTable.id,
    invoiceNumber: salesTable.invoiceNumber,
    customerId: salesTable.customerId,
    customerName: sql<string | null>`(select name from customers where id = sales.customer_id)`,
    customerMobile: sql<string | null>`(select phone from customers where id = sales.customer_id)`,
    type: salesTable.type,
    paymentMethod: salesTable.paymentMethod,
    subtotal: salesTable.subtotal,
    discount: salesTable.discount,
    tax: salesTable.tax,
    totalAmount: salesTable.totalAmount,
    paidAmount: salesTable.paidAmount,
    dueAmount: salesTable.dueAmount,
    isReturn: salesTable.isReturn,
    returnReason: salesTable.returnReason,
    createdByName: sql<string | null>`(select name from users where id = sales.created_by_id)`,
    hasReturns: sql<boolean>`exists(select 1 from sales r where r.original_sale_id = sales.id)`,
    createdAt: salesTable.createdAt,
  }).from(salesTable).where(eq(salesTable.id, id));
  if (!s) return null;
  const items = await db.select({
    id: saleItemsTable.id,
    productId: saleItemsTable.productId,
    productName: sql<string | null>`(select name from products where id = sale_items.product_id)`,
    quantity: saleItemsTable.quantity,
    price: saleItemsTable.price,
    discount: saleItemsTable.discount,
  }).from(saleItemsTable).where(eq(saleItemsTable.saleId, id));

  // Already-returned quantity per product across all returns linked to this sale.
  const returnedMap = await getReturnedQtyByProduct(id);

  return {
    ...s,
    subtotal: Number(s.subtotal), discount: Number(s.discount), tax: Number(s.tax),
    totalAmount: Number(s.totalAmount), paidAmount: Number(s.paidAmount), dueAmount: Number(s.dueAmount),
    createdAt: s.createdAt.toISOString(),
    items: items.map(i => ({
      ...i,
      price: Number(i.price),
      discount: Number(i.discount),
      returnedQuantity: returnedMap.get(i.productId) ?? 0,
    })),
  };
}

// Sum of returned quantities per product for all returns linked to an original sale.
async function getReturnedQtyByProduct(originalSaleId: number): Promise<Map<number, number>> {
  const rows = await db
    .select({ productId: saleItemsTable.productId, qty: sql<number>`sum(${saleItemsTable.quantity})` })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .where(eq(salesTable.originalSaleId, originalSaleId))
    .groupBy(saleItemsTable.productId);
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.productId, Number(r.qty));
  return map;
}

router.get("/sales", requireAuth, async (req, res): Promise<void> => {
  const params = ListSalesQueryParams.safeParse(req.query);
  const q = (params.success ? params.data : {}) as any;
  const limit = q.limit ? Number(q.limit) : 200;

  const conditions = [];
  if (q.date) conditions.push(sql`cast(${salesTable.createdAt} as date) = cast(${String(q.date)} as date)`);
  if (q.startDate) conditions.push(sql`cast(${salesTable.createdAt} as date) >= cast(${String(q.startDate)} as date)`);
  if (q.endDate) conditions.push(sql`cast(${salesTable.createdAt} as date) <= cast(${String(q.endDate)} as date)`);
  if (q.invoiceNumber) conditions.push(sql`${salesTable.invoiceNumber} LIKE ${"%" + String(q.invoiceNumber) + "%"}`);
  if (q.customerName) conditions.push(sql`(select name from customers where id = sales.customer_id) LIKE ${"%" + String(q.customerName) + "%"}`);
  if (q.customerMobile) conditions.push(sql`(select phone from customers where id = sales.customer_id) LIKE ${"%" + String(q.customerMobile) + "%"}`);
  if (q.productName) conditions.push(sql`exists(select 1 from sale_items si join products p on p.id = si.product_id where si.sale_id = sales.id and p.name LIKE ${"%" + String(q.productName) + "%"})`);
  const where = conditions.length ? sql.join(conditions, sql` AND `) : undefined;

  const sales = await db.select({
    id: salesTable.id,
    invoiceNumber: salesTable.invoiceNumber,
    customerId: salesTable.customerId,
    customerName: sql<string | null>`(select name from customers where id = sales.customer_id)`,
    customerMobile: sql<string | null>`(select phone from customers where id = sales.customer_id)`,
    type: salesTable.type,
    paymentMethod: salesTable.paymentMethod,
    subtotal: salesTable.subtotal,
    discount: salesTable.discount,
    tax: salesTable.tax,
    totalAmount: salesTable.totalAmount,
    paidAmount: salesTable.paidAmount,
    dueAmount: salesTable.dueAmount,
    isReturn: salesTable.isReturn,
    returnReason: salesTable.returnReason,
    createdByName: sql<string | null>`(select name from users where id = sales.created_by_id)`,
    hasReturns: sql<boolean>`exists(select 1 from sales r where r.original_sale_id = sales.id)`,
    createdAt: salesTable.createdAt,
  }).from(salesTable).where(where).orderBy(sql`created_at desc`).limit(limit);
  res.json(sales.map(s => ({
    ...s,
    subtotal: Number(s.subtotal), discount: Number(s.discount), tax: Number(s.tax),
    totalAmount: Number(s.totalAmount), paidAmount: Number(s.paidAmount), dueAmount: Number(s.dueAmount),
    createdAt: s.createdAt.toISOString(), items: [],
  })));
});

router.post("/sales", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { customerId, paymentMethod, type, discount, tax, paidAmount, items } = parsed.data;

  // Block sale if any item is expired
  for (const item of items) {
    const [product] = await db.select({ expiryDate: productsTable.expiryDate, name: productsTable.name })
      .from(productsTable).where(eq(productsTable.id, item.productId));
    if (product?.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(product.expiryDate)) {
      if (new Date(product.expiryDate) < new Date()) {
        res.status(400).json({ error: `Product "${product.name}" has expired (${product.expiryDate}). Remove it before completing the sale.` });
        return;
      }
    }
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity - (i.discount ?? 0), 0);
  const totalAmount = subtotal - (discount ?? 0) + (tax ?? 0);
  const finalPaid = paidAmount ?? totalAmount;
  const due = totalAmount - finalPaid;

  // Walk-in (no customer) sales must be paid in full — credit requires a registered customer.
  if (!customerId) {
    if ((type ?? "cash") === "credit" || (paymentMethod ?? "cash") === "credit") {
      res.status(400).json({ error: "Walk-in customers cannot be billed on credit. Select a customer or collect full payment." });
      return;
    }
    if (due > 0.009) {
      res.status(400).json({ error: "Walk-in sale must be fully paid. Cash received is less than the total amount." });
      return;
    }
  }

  const invoiceNumber = `INV-${Date.now()}`;
  const [{ id: saleId }] = await db.insert(salesTable).values({
    invoiceNumber, customerId: customerId ?? null, type: type ?? "cash",
    paymentMethod: paymentMethod ?? "cash",
    subtotal: String(subtotal), discount: String(discount ?? 0), tax: String(tax ?? 0),
    totalAmount: String(totalAmount), paidAmount: String(paidAmount ?? totalAmount), dueAmount: String(due),
    createdById: req.user?.userId ?? null,
  }).$returningId();
  await db.insert(saleItemsTable).values(items.map(i => ({
    saleId: saleId, productId: i.productId, quantity: i.quantity,
    price: String(i.price), discount: String(i.discount ?? 0),
  })));
  for (const item of items) {
    await db.execute(sql`UPDATE products SET stock = GREATEST(0, stock - ${item.quantity}) WHERE id = ${item.productId}`);
  }

  // Auto-apply any available advance/prepaid credit against the outstanding due.
  // Lock the customer row so concurrent sales can't both spend the same advance.
  let advanceApplied = 0;
  if (customerId && due > 0.009) {
    try {
      advanceApplied = await db.transaction(async (tx) => {
        const r = (await tx.execute(sql`SELECT cast(advance_balance as decimal(18,2)) as adv, cast(advance_paid_balance as decimal(18,2)) as paid FROM customers WHERE id = ${customerId} FOR UPDATE`)) as any;
        const row = Array.isArray(r) && Array.isArray(r[0]) ? r[0][0] : (Array.isArray(r) ? r[0] : r?.rows?.[0]);
        const advance = Number(row?.adv ?? 0);
        if (advance <= 0.009) return 0;
        const apply = Math.min(advance, due);
        if (apply <= 0.009) return 0;
        await tx.execute(sql`UPDATE sales SET paid_amount = cast(paid_amount as decimal(18,2)) + ${String(apply.toFixed(2))}, due_amount = cast(due_amount as decimal(18,2)) - ${String(apply.toFixed(2))} WHERE id = ${saleId}`);
        await tx.execute(sql`UPDATE customers SET advance_balance = cast(advance_balance as decimal(18,2)) - ${String(apply.toFixed(2))}, advance_paid_balance = cast(advance_paid_balance as decimal(18,2)) + ${String(apply.toFixed(2))} WHERE id = ${customerId}`);
        const ins = (await tx.execute(sql`INSERT INTO customer_transactions (customer_id, account, txn_type, direction, amount, payment_method, reference_no, note, txn_date, created_by_id) VALUES (${customerId}, 'advance', 'advance_applied', 'debit', ${String(apply.toFixed(2))}, 'advance', 'PENDING', ${`Applied to invoice ${invoiceNumber}`}, NOW(), ${req.user?.userId ?? null})`)) as any;
        const newId = Array.isArray(ins) ? (ins[0]?.insertId ?? (ins[0] as any)?.[0]?.insertId) : ins?.insertId;
        if (newId) await tx.execute(sql`UPDATE customer_transactions SET reference_no = ${`APD-${String(newId).padStart(6, "0")}`} WHERE id = ${newId}`);
        return apply;
      });
    } catch (err) {
      req.log.error({ err, customerId, saleId }, "advance auto-apply failed; sale stands without advance applied");
    }
  }
  // WhatsApp automation: credit invoice when there is an outstanding balance,
  // otherwise a normal sales invoice. Only fires for registered customers.
  if (customerId) {
    const effectiveDue = due - advanceApplied;
    const isCredit = (type ?? "cash") === "credit" || (paymentMethod ?? "cash") === "credit" || effectiveDue > 0.009;
    void triggerAutomation({
      trigger: isCredit ? "credit_sale_invoice" : "sales_invoice",
      customerId,
      variables: {
        invoice_no: invoiceNumber,
        amount: PKR(totalAmount),
        due_amount: PKR(Math.max(0, effectiveDue)),
        payment_method: paymentMethod ?? "cash",
      },
    }, req.log);
  }

  const result = await getSaleWithItems(saleId);
  res.status(201).json(result);
});

router.get("/sales/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSaleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const sale = await getSaleWithItems(params.data.id);
  if (!sale) { res.status(404).json({ error: "Sale not found" }); return; }
  res.json(sale);
});

// ── Customer Returns ──────────────────────────────────────────────────────────

// Manual return must be declared BEFORE :id routes to avoid shadowing
router.post("/sales/manual-return", requireAuth, async (req, res): Promise<void> => {
  const { items, returnReason, customerId } = req.body;
  if (!returnReason || !String(returnReason).trim()) {
    res.status(400).json({ error: "Return reason is required." }); return;
  }
  if (!Array.isArray(items) || !items.length) {
    res.status(400).json({ error: "items must be a non-empty array" }); return;
  }
  for (const it of items) {
    const pid = Number(it.productId);
    const reqQty = Number(it.quantity);
    const price = Number(it.price);
    if (!Number.isFinite(pid) || pid <= 0) {
      res.status(400).json({ error: "Invalid product in return items." }); return;
    }
    if (!Number.isInteger(reqQty) || reqQty <= 0) {
      res.status(400).json({ error: "Return quantity must be a positive whole number." }); return;
    }
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ error: "Return price must be zero or greater." }); return;
    }
  }
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0);
  const invoiceNumber = `RET-${Date.now()}`;
  const [{ id: saleId }] = await db.insert(salesTable).values({
    invoiceNumber, customerId: customerId ?? null, type: "return", paymentMethod: "cash",
    subtotal: String(subtotal), discount: "0", tax: "0",
    totalAmount: String(subtotal), paidAmount: String(subtotal), dueAmount: "0",
    isReturn: true, returnReason: String(returnReason), createdById: req.user?.userId ?? null,
  }).$returningId();
  await db.insert(saleItemsTable).values(items.map((i: any) => ({
    saleId: saleId, productId: Number(i.productId), quantity: Number(i.quantity),
    price: String(i.price), discount: "0",
  })));
  for (const item of items) {
    await db.execute(sql`UPDATE products SET stock = stock + ${Number(item.quantity)} WHERE id = ${Number(item.productId)}`);
  }
  if (customerId) {
    void triggerAutomation({
      trigger: "sales_return",
      customerId: Number(customerId),
      variables: { invoice_no: invoiceNumber, amount: PKR(subtotal) },
    }, req.log);
  }
  const result = await getSaleWithItems(saleId);
  res.status(201).json(result);
});

router.post("/sales/:id/return", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid sale id" }); return; }
  const { items, returnReason } = req.body;
  if (!returnReason || !String(returnReason).trim()) {
    res.status(400).json({ error: "Return reason is required." }); return;
  }
  if (!Array.isArray(items) || !items.length) {
    res.status(400).json({ error: "items must be a non-empty array" }); return;
  }

  // Load the original sale and its sold quantities for de-dup validation.
  const [original] = await db.select({ id: salesTable.id, isReturn: salesTable.isReturn, customerId: salesTable.customerId })
    .from(salesTable).where(eq(salesTable.id, id));
  if (!original) { res.status(404).json({ error: "Original invoice not found." }); return; }
  if (original.isReturn) { res.status(400).json({ error: "Cannot return a return invoice." }); return; }

  const soldRows = await db.select({
    productId: saleItemsTable.productId,
    quantity: saleItemsTable.quantity,
    price: saleItemsTable.price,
    discount: saleItemsTable.discount,
  }).from(saleItemsTable).where(eq(saleItemsTable.saleId, id));
  const soldMap = new Map<number, number>();
  // Per-product net value actually paid (price*qty − line discount) and total qty,
  // so we can recover the per-unit amount the customer paid. A return must refund
  // exactly that — refunding the list price ignores the original discount and
  // over-refunds, which shows up as phantom negative profit on fully-returned items.
  const netValueMap = new Map<number, number>();
  for (const r of soldRows) {
    soldMap.set(r.productId, (soldMap.get(r.productId) ?? 0) + r.quantity);
    netValueMap.set(r.productId, (netValueMap.get(r.productId) ?? 0) + (Number(r.price) * r.quantity - Number(r.discount)));
  }
  // Round to 2 decimals (DECIMAL(12,2) column scale) so the stored line price and
  // the computed subtotal use the exact same value and stay consistent.
  const netUnitPrice = (pid: number): number => {
    const qty = soldMap.get(pid) ?? 0;
    return qty > 0 ? Math.round(((netValueMap.get(pid) ?? 0) / qty) * 100) / 100 : 0;
  };

  const alreadyReturned = await getReturnedQtyByProduct(id);

  // If every sold line is already fully returned, the whole invoice is done.
  const fullyReturned = soldRows.length > 0 &&
    [...soldMap.entries()].every(([pid, qty]) => (alreadyReturned.get(pid) ?? 0) >= qty);
  if (fullyReturned) {
    res.status(409).json({ error: "This invoice has already been fully returned." });
    return;
  }

  // Aggregate requested quantities per product so the same product split
  // across multiple lines cannot bypass the remaining-returnable check.
  const requestedMap = new Map<number, number>();
  for (const it of items) {
    const pid = Number(it.productId);
    const reqQty = Number(it.quantity);
    const price = Number(it.price);
    if (!Number.isFinite(pid) || pid <= 0) {
      res.status(400).json({ error: "Invalid product in return items." }); return;
    }
    if (!Number.isInteger(reqQty) || reqQty <= 0) {
      res.status(400).json({ error: "Return quantity must be a positive whole number." }); return;
    }
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ error: "Return price must be zero or greater." }); return;
    }
    requestedMap.set(pid, (requestedMap.get(pid) ?? 0) + reqQty);
  }

  // Validate aggregated requested quantity against remaining returnable quantity.
  for (const [pid, reqQty] of requestedMap.entries()) {
    const sold = soldMap.get(pid) ?? 0;
    if (sold === 0) {
      res.status(400).json({ error: "One of the items was not part of this invoice." });
      return;
    }
    const remaining = sold - (alreadyReturned.get(pid) ?? 0);
    if (reqQty > remaining) {
      res.status(409).json({
        error: remaining <= 0
          ? "This item has already been fully returned."
          : `Only ${remaining} unit(s) remain returnable for this item.`,
      });
      return;
    }
  }

  // Refund value is derived from what the customer actually paid per unit on the
  // original sale (net of line discount), NOT the client-supplied list price.
  const subtotal = items.reduce((s: number, i: any) => s + netUnitPrice(Number(i.productId)) * Number(i.quantity), 0);
  const invoiceNumber = `RET-${Date.now()}`;
  const [{ id: saleId }] = await db.insert(salesTable).values({
    invoiceNumber, customerId: original.customerId ?? null, type: "return", paymentMethod: "cash",
    subtotal: String(subtotal), discount: "0", tax: "0",
    totalAmount: String(subtotal), paidAmount: String(subtotal), dueAmount: "0",
    isReturn: true, returnReason: String(returnReason), originalSaleId: id, createdById: req.user?.userId ?? null,
  }).$returningId();
  await db.insert(saleItemsTable).values(items.map((i: any) => ({
    saleId: saleId, productId: Number(i.productId), quantity: Number(i.quantity),
    price: String(netUnitPrice(Number(i.productId))), discount: "0",
  })));
  for (const item of items) {
    await db.execute(sql`UPDATE products SET stock = stock + ${Number(item.quantity)} WHERE id = ${Number(item.productId)}`);
  }
  if (original.customerId) {
    void triggerAutomation({
      trigger: "sales_return",
      customerId: original.customerId,
      variables: { invoice_no: invoiceNumber, amount: PKR(subtotal) },
    }, req.log);
  }
  const result = await getSaleWithItems(saleId);
  res.status(201).json(result);
});

export default router;
