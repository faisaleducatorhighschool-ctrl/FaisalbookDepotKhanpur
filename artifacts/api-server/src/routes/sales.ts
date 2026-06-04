import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable } from "@workspace/db";
import { CreateSaleBody, GetSaleParams, ListSalesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

async function getSaleWithItems(id: number) {
  const [s] = await db.select({
    id: salesTable.id,
    invoiceNumber: salesTable.invoiceNumber,
    customerId: salesTable.customerId,
    customerName: sql<string | null>`(select name from customers where id = sales.customer_id)`,
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
  return {
    ...s,
    subtotal: Number(s.subtotal), discount: Number(s.discount), tax: Number(s.tax),
    totalAmount: Number(s.totalAmount), paidAmount: Number(s.paidAmount), dueAmount: Number(s.dueAmount),
    createdAt: s.createdAt.toISOString(),
    items: items.map(i => ({ ...i, price: Number(i.price), discount: Number(i.discount) })),
  };
}

router.get("/sales", requireAuth, async (req, res): Promise<void> => {
  const params = ListSalesQueryParams.safeParse(req.query);
  const limit = (params.success && (params.data as any).limit) ? (params.data as any).limit : 200;
  const sales = await db.select({
    id: salesTable.id,
    invoiceNumber: salesTable.invoiceNumber,
    customerId: salesTable.customerId,
    customerName: sql<string | null>`(select name from customers where id = sales.customer_id)`,
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
    createdAt: salesTable.createdAt,
  }).from(salesTable).orderBy(sql`created_at desc`).limit(limit);
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
  const due = totalAmount - (paidAmount ?? totalAmount);
  const invoiceNumber = `INV-${Date.now()}`;
  const [sale] = await db.insert(salesTable).values({
    invoiceNumber, customerId: customerId ?? null, type: type ?? "cash",
    paymentMethod: paymentMethod ?? "cash",
    subtotal: String(subtotal), discount: String(discount ?? 0), tax: String(tax ?? 0),
    totalAmount: String(totalAmount), paidAmount: String(paidAmount ?? totalAmount), dueAmount: String(due),
  }).returning();
  await db.insert(saleItemsTable).values(items.map(i => ({
    saleId: sale.id, productId: i.productId, quantity: i.quantity,
    price: String(i.price), discount: String(i.discount ?? 0),
  })));
  for (const item of items) {
    await db.execute(sql`UPDATE products SET stock = GREATEST(0, stock - ${item.quantity}) WHERE id = ${item.productId}`);
  }
  const result = await getSaleWithItems(sale.id);
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
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0);
  const invoiceNumber = `RET-${Date.now()}`;
  const [sale] = await db.insert(salesTable).values({
    invoiceNumber, customerId: customerId ?? null, type: "return", paymentMethod: "cash",
    subtotal: String(subtotal), discount: "0", tax: "0",
    totalAmount: String(subtotal), paidAmount: String(subtotal), dueAmount: "0",
    isReturn: true, returnReason: String(returnReason),
  }).returning();
  await db.insert(saleItemsTable).values(items.map((i: any) => ({
    saleId: sale.id, productId: Number(i.productId), quantity: Number(i.quantity),
    price: String(i.price), discount: "0",
  })));
  for (const item of items) {
    await db.execute(sql`UPDATE products SET stock = stock + ${Number(item.quantity)} WHERE id = ${Number(item.productId)}`);
  }
  const result = await getSaleWithItems(sale.id);
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
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0);
  const invoiceNumber = `RET-${Date.now()}`;
  const [sale] = await db.insert(salesTable).values({
    invoiceNumber, type: "return", paymentMethod: "cash",
    subtotal: String(subtotal), discount: "0", tax: "0",
    totalAmount: String(subtotal), paidAmount: String(subtotal), dueAmount: "0",
    isReturn: true, returnReason: String(returnReason),
  }).returning();
  await db.insert(saleItemsTable).values(items.map((i: any) => ({
    saleId: sale.id, productId: Number(i.productId), quantity: Number(i.quantity),
    price: String(i.price), discount: "0",
  })));
  for (const item of items) {
    await db.execute(sql`UPDATE products SET stock = stock + ${Number(item.quantity)} WHERE id = ${Number(item.productId)}`);
  }
  const result = await getSaleWithItems(sale.id);
  res.status(201).json(result);
});

export default router;
