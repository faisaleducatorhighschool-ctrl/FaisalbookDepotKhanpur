import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable } from "@workspace/db";
import { CreateOrderBody, UpdateOrderBody, UpdateOrderParams, GetOrderParams, DeleteOrderParams, ListOrdersQueryParams, UpdateOrderStatusBody, UpdateOrderStatusParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";
import { triggerAutomation } from "../lib/whatsapp.js";

const router = Router();

const PKR = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

// Maps an order status to the WhatsApp automation trigger for that event.
const ORDER_STATUS_TRIGGER: Record<string, string> = {
  confirmed: "order_confirmed",
  approved: "order_approved",
  processing: "order_processing",
  packed: "order_packed",
  out_for_delivery: "order_out_for_delivery",
  delivered: "order_delivered",
  cancelled: "order_cancelled",
  returned: "order_returned",
};

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select({
    id: ordersTable.id,
    orderNumber: ordersTable.orderNumber,
    customerId: ordersTable.customerId,
    customerName: sql<string | null>`(select name from customers where id = orders.customer_id)`,
    status: ordersTable.status,
    deliveryMethod: ordersTable.deliveryMethod,
    paymentMethod: ordersTable.paymentMethod,
    paymentStatus: ordersTable.paymentStatus,
    subtotal: ordersTable.subtotal,
    discount: ordersTable.discount,
    tax: ordersTable.tax,
    totalAmount: ordersTable.totalAmount,
    paidAmount: ordersTable.paidAmount,
    dueAmount: ordersTable.dueAmount,
    notes: ordersTable.notes,
    createdAt: ordersTable.createdAt,
  }).from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;

  const items = await db.select({
    id: orderItemsTable.id,
    productId: orderItemsTable.productId,
    productName: sql<string | null>`(select name from products where id = order_items.product_id)`,
    quantity: orderItemsTable.quantity,
    price: orderItemsTable.price,
    discount: orderItemsTable.discount,
  }).from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));

  return {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    tax: Number(order.tax),
    totalAmount: Number(order.totalAmount),
    paidAmount: Number(order.paidAmount),
    dueAmount: Number(order.dueAmount),
    createdAt: order.createdAt.toISOString(),
    items: items.map(i => ({ ...i, price: Number(i.price), discount: Number(i.discount) })),
  };
}

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const params = ListOrdersQueryParams.safeParse(req.query);
  let query = db.select({
    id: ordersTable.id,
    orderNumber: ordersTable.orderNumber,
    customerId: ordersTable.customerId,
    customerName: sql<string | null>`(select name from customers where id = orders.customer_id)`,
    status: ordersTable.status,
    deliveryMethod: ordersTable.deliveryMethod,
    paymentMethod: ordersTable.paymentMethod,
    paymentStatus: ordersTable.paymentStatus,
    subtotal: ordersTable.subtotal,
    discount: ordersTable.discount,
    tax: ordersTable.tax,
    totalAmount: ordersTable.totalAmount,
    paidAmount: ordersTable.paidAmount,
    dueAmount: ordersTable.dueAmount,
    notes: ordersTable.notes,
    createdAt: ordersTable.createdAt,
  }).from(ordersTable).$dynamic();

  if (params.success) {
    if (params.data.status) query = query.where(eq(ordersTable.status, params.data.status));
    if (params.data.customerId) query = query.where(eq(ordersTable.customerId, Number(params.data.customerId)));
  }

  const orders = await query.orderBy(sql`orders.created_at desc`);
  res.json(orders.map(o => ({
    ...o,
    subtotal: Number(o.subtotal), discount: Number(o.discount), tax: Number(o.tax),
    totalAmount: Number(o.totalAmount), paidAmount: Number(o.paidAmount), dueAmount: Number(o.dueAmount),
    createdAt: o.createdAt.toISOString(), items: [],
  })));
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { customerId, deliveryMethod, paymentMethod, discount, tax, paidAmount, notes, items } = parsed.data;

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity - (i.discount ?? 0), 0);
  const totalAmount = subtotal - (discount ?? 0) + (tax ?? 0);
  const due = totalAmount - (paidAmount ?? 0);
  const orderNumber = `ORD-${Date.now()}`;

  const [{ id: newOrderId }] = await db.insert(ordersTable).values({
    orderNumber,
    customerId: customerId ?? null,
    deliveryMethod: deliveryMethod ?? "home_delivery",
    paymentMethod: paymentMethod ?? "cash",
    subtotal: String(subtotal),
    discount: String(discount ?? 0),
    tax: String(tax ?? 0),
    totalAmount: String(totalAmount),
    paidAmount: String(paidAmount ?? 0),
    dueAmount: String(due),
    notes: notes ?? null,
  }).$returningId();

  await db.insert(orderItemsTable).values(items.map(i => ({
    orderId: newOrderId,
    productId: i.productId,
    quantity: i.quantity,
    price: String(i.price),
    discount: String(i.discount ?? 0),
  })));

  const result = await getOrderWithItems(newOrderId);
  res.status(201).json(result);
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const order = await getOrderWithItems(params.data.id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(order);
});

router.patch("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const upd: Record<string, unknown> = {};
  if (parsed.data.notes !== undefined) upd.notes = parsed.data.notes;
  if (parsed.data.paymentMethod !== undefined) upd.paymentMethod = parsed.data.paymentMethod;
  if (parsed.data.paidAmount !== undefined) upd.paidAmount = String(parsed.data.paidAmount);
  await db.update(ordersTable).set(upd).where(eq(ordersTable.id, params.data.id));
  const order = await getOrderWithItems(params.data.id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(order);
});

router.patch("/orders/:id/status", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, params.data.id));
  const order = await getOrderWithItems(params.data.id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // WhatsApp automation for the new order status (registered customers only).
  const trigger = ORDER_STATUS_TRIGGER[parsed.data.status];
  if (trigger && order.customerId) {
    void triggerAutomation({
      trigger,
      customerId: order.customerId,
      variables: { order_no: order.orderNumber, amount: PKR(order.totalAmount), due_amount: PKR(order.dueAmount) },
    }, req.log);
  }

  res.json(order);
});

router.delete("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, params.data.id));
  await db.delete(ordersTable).where(eq(ordersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
