import { Router } from "express";
import { db, productsTable, ordersTable, customersTable, salesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

async function xr(q: ReturnType<typeof sql>): Promise<any[]> {
  const r = await db.execute(q) as any;
  // mysql2 returns [rows, fields]; rows is the first element.
  if (Array.isArray(r) && Array.isArray(r[0])) return r[0];
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const [productStats] = await db.select({
    total: sql<number>`count(*)`,
    lowStock: sql<number>`sum(case when stock <= low_stock_limit and stock > 0 then 1 else 0 end)`,
    outOfStock: sql<number>`sum(case when stock = 0 then 1 else 0 end)`,
  }).from(productsTable);

  const [orderStats] = await db.select({
    total: sql<number>`count(*)`,
    pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
  }).from(ordersTable);

  const [customerStats] = await db.select({ total: sql<number>`count(*)` }).from(customersTable);

  const [salesStats] = await db.select({
    todaySales: sql<number>`coalesce(sum(case when created_at >= curdate() then (case when is_return then -1 else 1 end) * cast(total_amount as decimal(18,2)) else 0 end), 0)`,
    monthSales: sql<number>`coalesce(sum(case when created_at >= date_format(curdate(), '%Y-%m-01') then (case when is_return then -1 else 1 end) * cast(total_amount as decimal(18,2)) else 0 end), 0)`,
    totalRevenue: sql<number>`coalesce(sum((case when is_return then -1 else 1 end) * cast(total_amount as decimal(18,2))), 0)`,
    totalReturns: sql<number>`sum(case when is_return = true then 1 else 0 end)`,
  }).from(salesTable);

  // Expiry stats (only for products with valid YYYY-MM-DD expiry dates)
  const [expiryStats] = await xr(sql`
    SELECT
      sum(case when expiry_date IS NOT NULL
          AND expiry_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND cast(expiry_date as date) < curdate()
          AND stock > 0 then 1 else 0 end) as expired_count,
      sum(case when expiry_date IS NOT NULL
          AND expiry_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND cast(expiry_date as date) >= curdate()
          AND cast(expiry_date as date) <= date_add(curdate(), interval 7 day)
          AND stock > 0 then 1 else 0 end) as expiring_7days,
      sum(case when expiry_date IS NOT NULL
          AND expiry_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND cast(expiry_date as date) >= curdate()
          AND cast(expiry_date as date) <= date_add(curdate(), interval 15 day)
          AND stock > 0 then 1 else 0 end) as expiring_15days,
      sum(case when expiry_date IS NOT NULL
          AND expiry_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND cast(expiry_date as date) >= curdate()
          AND cast(expiry_date as date) <= date_add(curdate(), interval 30 day)
          AND stock > 0 then 1 else 0 end) as expiring_30days,
      coalesce(sum(
        case when expiry_date IS NOT NULL
          AND expiry_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND cast(expiry_date as date) >= curdate()
          AND cast(expiry_date as date) <= date_add(curdate(), interval 30 day)
          AND stock > 0
        then stock * cast(cost_price as decimal(18,2)) else 0 end
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
      date_format(days.day, '%Y-%m-%d') as date,
      coalesce(sum((case when s.is_return then -1 else 1 end) * cast(s.total_amount as decimal(18,2))), 0) as sales,
      sum(case when s.id is not null and s.is_return = false then 1 else 0 end) as orders
    FROM (
      SELECT curdate() - INTERVAL 6 DAY AS day
      UNION ALL SELECT curdate() - INTERVAL 5 DAY
      UNION ALL SELECT curdate() - INTERVAL 4 DAY
      UNION ALL SELECT curdate() - INTERVAL 3 DAY
      UNION ALL SELECT curdate() - INTERVAL 2 DAY
      UNION ALL SELECT curdate() - INTERVAL 1 DAY
      UNION ALL SELECT curdate()
    ) days
    LEFT JOIN sales s ON date(s.created_at) = days.day
    GROUP BY days.day ORDER BY days.day
  `);
  res.json(rows.map(r => ({ date: r.date, sales: Number(r.sales), orders: Number(r.orders) })));
});

export default router;
