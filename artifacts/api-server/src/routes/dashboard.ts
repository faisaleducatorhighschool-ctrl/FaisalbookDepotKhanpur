import { Router } from "express";
import { db, productsTable, ordersTable, customersTable, salesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

async function xr(q: ReturnType<typeof sql>): Promise<any[]> {
  const r = await db.execute(q) as any;
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const [productStats] = await db.select({
    total: sql<number>`count(*)`,
    lowStock: sql<number>`count(*) filter (where stock <= low_stock_limit and stock > 0)`,
    outOfStock: sql<number>`count(*) filter (where stock = 0)`,
  }).from(productsTable);

  const [orderStats] = await db.select({
    total: sql<number>`count(*)`,
    pending: sql<number>`count(*) filter (where status = 'pending')`,
  }).from(ordersTable);

  const [customerStats] = await db.select({ total: sql<number>`count(*)` }).from(customersTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [salesStats] = await db.select({
    todaySales: sql<number>`coalesce(sum(case when created_at >= ${today.toISOString()} and is_return = false then total_amount::numeric else 0 end), 0)`,
    monthSales: sql<number>`coalesce(sum(case when created_at >= ${monthStart.toISOString()} and is_return = false then total_amount::numeric else 0 end), 0)`,
    totalRevenue: sql<number>`coalesce(sum(case when is_return = false then total_amount::numeric else 0 end), 0)`,
    totalReturns: sql<number>`count(*) filter (where is_return = true)`,
  }).from(salesTable);

  // Expiry stats (only for products with valid YYYY-MM-DD expiry dates)
  const [expiryStats] = await xr(sql`
    SELECT
      count(*) filter (
        where expiry_date IS NOT NULL
          AND expiry_date ~ '^\d{4}-\d{2}-\d{2}$'
          AND expiry_date::date < current_date
          AND stock > 0
      ) as expired_count,
      count(*) filter (
        where expiry_date IS NOT NULL
          AND expiry_date ~ '^\d{4}-\d{2}-\d{2}$'
          AND expiry_date::date >= current_date
          AND expiry_date::date <= current_date + interval '7 days'
          AND stock > 0
      ) as expiring_7days,
      count(*) filter (
        where expiry_date IS NOT NULL
          AND expiry_date ~ '^\d{4}-\d{2}-\d{2}$'
          AND expiry_date::date >= current_date
          AND expiry_date::date <= current_date + interval '15 days'
          AND stock > 0
      ) as expiring_15days,
      count(*) filter (
        where expiry_date IS NOT NULL
          AND expiry_date ~ '^\d{4}-\d{2}-\d{2}$'
          AND expiry_date::date >= current_date
          AND expiry_date::date <= current_date + interval '30 days'
          AND stock > 0
      ) as expiring_30days,
      coalesce(sum(
        case when expiry_date IS NOT NULL
          AND expiry_date ~ '^\d{4}-\d{2}-\d{2}$'
          AND expiry_date::date >= current_date
          AND expiry_date::date <= current_date + interval '30 days'
          AND stock > 0
        then stock * cost_price::numeric else 0 end
      ), 0) as near_expiry_value
    FROM products WHERE status = 'active'
  `);

  res.json({
    totalRevenue: Number(salesStats.totalRevenue),
    totalOrders: Number(orderStats.total),
    totalProducts: Number(productStats.total),
    totalCustomers: Number(customerStats.total),
    pendingOrders: Number(orderStats.pending),
    lowStockCount: Number(productStats.lowStock),
    outOfStockCount: Number(productStats.outOfStock),
    todaySales: Number(salesStats.todaySales),
    monthSales: Number(salesStats.monthSales),
    totalReturns: Number(salesStats.totalReturns),
    expiredCount: Number(expiryStats?.expired_count ?? 0),
    expiring7Days: Number(expiryStats?.expiring_7days ?? 0),
    expiring15Days: Number(expiryStats?.expiring_15days ?? 0),
    expiring30Days: Number(expiryStats?.expiring_30days ?? 0),
    nearExpiryValue: Number(expiryStats?.near_expiry_value ?? 0),
  });
});

router.get("/dashboard/recent-orders", requireAuth, async (_req, res): Promise<void> => {
  const orders = await db.select({
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
  }).from(ordersTable).orderBy(sql`created_at desc`).limit(10);

  res.json(orders.map(o => ({
    ...o,
    subtotal: Number(o.subtotal), discount: Number(o.discount), tax: Number(o.tax),
    totalAmount: Number(o.totalAmount), paidAmount: Number(o.paidAmount), dueAmount: Number(o.dueAmount),
    items: [], createdAt: o.createdAt.toISOString(),
  })));
});

router.get("/dashboard/sales-chart", requireAuth, async (_req, res): Promise<void> => {
  const rows = await xr(sql`
    SELECT
      to_char(date_trunc('day', gs.day), 'YYYY-MM-DD') as date,
      coalesce(sum(s.total_amount::numeric), 0) as sales,
      count(s.id) as orders
    FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') gs(day)
    LEFT JOIN sales s ON date_trunc('day', s.created_at) = gs.day AND s.is_return = false
    GROUP BY gs.day ORDER BY gs.day
  `);
  res.json(rows.map(r => ({ date: r.date, sales: Number(r.sales), orders: Number(r.orders) })));
});

export default router;
