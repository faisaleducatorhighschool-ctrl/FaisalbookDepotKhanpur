import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, productsTable, expensesTable, employeesTable } from "@workspace/db";
import { GetSalesReportQueryParams, GetProfitLossReportQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

async function xr(q: ReturnType<typeof sql>): Promise<any[]> {
  const r = await db.execute(q) as any;
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

function dateRange(req: any) {
  const startDate = req.query.startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = req.query.endDate || new Date().toISOString().slice(0, 10);
  return { startDate: String(startDate), endDate: String(endDate) };
}

// ── Date-wise Sales Report ─────────────────────────────────────────────────────

router.get("/reports/sales", requireAuth, async (req, res): Promise<void> => {
  const params = GetSalesReportQueryParams.safeParse(req.query);
  const startDate = (params.success && params.data.startDate) ? params.data.startDate : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = (params.success && params.data.endDate) ? params.data.endDate : new Date().toISOString().slice(0, 10);
  const period = (params.success && params.data.period) ? params.data.period : "daily";

  const [totals] = await xr(sql`
    SELECT
      coalesce(sum(total_amount::numeric), 0) as total_revenue,
      count(*) as total_orders,
      coalesce(sum((select sum(quantity) from sale_items where sale_id = s.id)), 0) as total_items
    FROM sales s
    WHERE created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      AND is_return = false
  `);

  const groupBy = period === "monthly" ? "date_trunc('month', created_at)::date"
    : period === "weekly" ? "date_trunc('week', created_at)::date"
    : "created_at::date";

  const data = await xr(sql`
    SELECT
      ${sql.raw(groupBy)}::text as date,
      count(*) as orders,
      coalesce(sum(total_amount::numeric), 0) as revenue
    FROM sales
    WHERE created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      AND is_return = false
    GROUP BY ${sql.raw(groupBy)}
    ORDER BY ${sql.raw(groupBy)}
  `);

  res.json({
    totalRevenue: Number(totals?.total_revenue ?? 0),
    totalOrders: Number(totals?.total_orders ?? 0),
    totalItems: Number(totals?.total_items ?? 0),
    data: data.map(r => ({
      date: r.date,
      sales: Number(r.orders),
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    })),
  });
});

// ── Inventory Report ─────────────────────────────────────────────────────────────

router.get("/reports/inventory", requireAuth, async (_req, res): Promise<void> => {
  const items = await db.select({
    productId: productsTable.id,
    productName: productsTable.name,
    sku: productsTable.sku,
    stock: productsTable.stock,
    costPrice: productsTable.costPrice,
    lowStockLimit: productsTable.lowStockLimit,
    categoryName: sql<string | null>`(select name from categories where id = products.category_id)`,
  }).from(productsTable).orderBy(productsTable.name);

  const mapped = items.map(p => ({
    productId: p.productId,
    productName: p.productName,
    sku: p.sku,
    stock: p.stock,
    value: p.stock * Number(p.costPrice),
    categoryName: p.categoryName,
    lowStockLimit: p.lowStockLimit ?? 5,
  }));

  res.json({
    totalProducts: mapped.length,
    totalValue: mapped.reduce((s, i) => s + i.value, 0),
    totalStock: mapped.reduce((s, i) => s + i.stock, 0),
    items: mapped,
  });
});

// ── Profit & Loss ──────────────────────────────────────────────────────────────

router.get("/reports/profit-loss", requireAuth, async (req, res): Promise<void> => {
  const params = GetProfitLossReportQueryParams.safeParse(req.query);
  const startDate = (params.success && params.data.startDate) ? params.data.startDate : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = (params.success && params.data.endDate) ? params.data.endDate : new Date().toISOString().slice(0, 10);

  const [[rev], [cogs], [exp]] = await Promise.all([
    xr(sql`
      SELECT coalesce(sum(total_amount::numeric), 0) as revenue
      FROM sales
      WHERE is_return = false AND created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
    xr(sql`
      SELECT coalesce(sum(si.quantity * p.cost_price::numeric), 0) as cogs
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN sales s ON s.id = si.sale_id
      WHERE s.is_return = false AND s.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
    xr(sql`
      SELECT coalesce(sum(amount::numeric), 0) as expenses
      FROM expenses
      WHERE date::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
  ]);

  const revenue = Number(rev?.revenue ?? 0);
  const costOfGoods = Number(cogs?.cogs ?? 0);
  const expenses = Number(exp?.expenses ?? 0);
  const grossProfit = revenue - costOfGoods;
  const netProfit = grossProfit - expenses;
  res.json({ revenue, costOfGoods, grossProfit, expenses, netProfit });
});

// ── Product-wise Sales ────────────────────────────────────────────────────────

router.get("/reports/product-sales", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const rows = await xr(sql`
    SELECT
      p.id as product_id,
      p.name as product_name,
      p.sku,
      coalesce(sum(si.quantity), 0) as total_qty,
      coalesce(sum(si.quantity * si.price::numeric - si.discount::numeric), 0) as total_revenue,
      coalesce(sum(si.quantity * p.cost_price::numeric), 0) as total_cost,
      coalesce(sum(si.quantity * si.price::numeric - si.discount::numeric) - sum(si.quantity * p.cost_price::numeric), 0) as gross_profit
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    JOIN sales s ON s.id = si.sale_id
    WHERE s.is_return = false
      AND s.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    GROUP BY p.id, p.name, p.sku
    ORDER BY total_revenue DESC
  `);
  res.json(rows.map(r => ({
    productId: Number(r.product_id),
    productName: r.product_name,
    sku: r.sku,
    totalQty: Number(r.total_qty),
    totalRevenue: Number(r.total_revenue),
    totalCost: Number(r.total_cost),
    grossProfit: Number(r.gross_profit),
  })));
});

// ── Customer-wise Sales ───────────────────────────────────────────────────────

router.get("/reports/customer-sales", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const rows = await xr(sql`
    SELECT
      c.id as customer_id,
      c.name as customer_name,
      c.phone,
      count(distinct s.id) as total_orders,
      coalesce(sum(s.total_amount::numeric), 0) as total_amount,
      coalesce(sum(s.discount::numeric), 0) as total_discount,
      coalesce(sum(s.due_amount::numeric), 0) as total_due,
      coalesce(sum(s.paid_amount::numeric), 0) as total_paid
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    WHERE s.is_return = false
      AND s.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    GROUP BY c.id, c.name, c.phone
    ORDER BY total_amount DESC
  `);
  res.json(rows.map(r => ({
    customerId: Number(r.customer_id),
    customerName: r.customer_name,
    phone: r.phone,
    totalOrders: Number(r.total_orders),
    totalAmount: Number(r.total_amount),
    totalDiscount: Number(r.total_discount),
    totalDue: Number(r.total_due),
    totalPaid: Number(r.total_paid),
  })));
});

// ── Sales Returns ─────────────────────────────────────────────────────────────

router.get("/reports/returns", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const rows = await xr(sql`
    SELECT
      s.id,
      s.invoice_number,
      s.created_at,
      s.total_amount,
      s.payment_method,
      coalesce((select name from customers where id = s.customer_id), 'Walk-in') as customer_name,
      (
        SELECT json_agg(json_build_object(
          'productName', (select name from products where id = si.product_id),
          'quantity', si.quantity,
          'price', si.price::numeric
        ))
        FROM sale_items si WHERE si.sale_id = s.id
      ) as items
    FROM sales s
    WHERE s.is_return = true
      AND s.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    ORDER BY s.created_at DESC
  `);
  res.json(rows.map(r => ({
    id: Number(r.id),
    invoiceNumber: r.invoice_number,
    createdAt: r.created_at,
    totalAmount: Number(r.total_amount),
    paymentMethod: r.payment_method,
    customerName: r.customer_name,
    items: r.items ?? [],
  })));
});

// ── Discount Report ───────────────────────────────────────────────────────────

router.get("/reports/discounts", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const [[summary], rows] = await Promise.all([
    xr(sql`
      SELECT
        count(*) as total_sales,
        count(case when discount::numeric > 0 then 1 end) as discounted_sales,
        coalesce(sum(discount::numeric), 0) as total_discount,
        coalesce(sum(total_amount::numeric), 0) as total_revenue
      FROM sales
      WHERE is_return = false
        AND created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
    xr(sql`
      SELECT
        s.invoice_number,
        s.created_at,
        s.discount::numeric as discount,
        s.subtotal::numeric as subtotal,
        s.total_amount::numeric as total_amount,
        coalesce((select name from customers where id = s.customer_id), 'Walk-in') as customer_name
      FROM sales s
      WHERE s.is_return = false
        AND s.discount::numeric > 0
        AND s.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      ORDER BY s.discount::numeric DESC
    `),
  ]);

  res.json({
    totalSales: Number(summary?.total_sales ?? 0),
    discountedSales: Number(summary?.discounted_sales ?? 0),
    totalDiscount: Number(summary?.total_discount ?? 0),
    totalRevenue: Number(summary?.total_revenue ?? 0),
    rows: rows.map(r => ({
      invoiceNumber: r.invoice_number,
      createdAt: r.created_at,
      customerName: r.customer_name,
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      totalAmount: Number(r.total_amount),
    })),
  });
});

// ── Supplier-wise Purchases ───────────────────────────────────────────────────

router.get("/reports/supplier-purchases", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const rows = await xr(sql`
    SELECT
      s.id as supplier_id,
      s.name as supplier_name,
      s.company,
      count(distinct p.id) as total_orders,
      coalesce(sum(p.total_amount::numeric), 0) as total_amount,
      coalesce(sum(p.paid_amount::numeric), 0) as total_paid,
      coalesce(sum(p.due_amount::numeric), 0) as total_due
    FROM purchases p
    JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    GROUP BY s.id, s.name, s.company
    ORDER BY total_amount DESC
  `);
  res.json(rows.map(r => ({
    supplierId: Number(r.supplier_id),
    supplierName: r.supplier_name,
    company: r.company,
    totalOrders: Number(r.total_orders),
    totalAmount: Number(r.total_amount),
    totalPaid: Number(r.total_paid),
    totalDue: Number(r.total_due),
  })));
});

// ── Product-wise Purchases ────────────────────────────────────────────────────

router.get("/reports/product-purchases", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const rows = await xr(sql`
    SELECT
      p.id as product_id,
      p.name as product_name,
      p.sku,
      coalesce(sum(pi.quantity), 0) as total_qty,
      coalesce(sum(pi.quantity * pi.cost_price::numeric), 0) as total_cost
    FROM purchase_items pi
    JOIN products p ON p.id = pi.product_id
    JOIN purchases pu ON pu.id = pi.purchase_id
    WHERE pu.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    GROUP BY p.id, p.name, p.sku
    ORDER BY total_cost DESC
  `);
  res.json(rows.map(r => ({
    productId: Number(r.product_id),
    productName: r.product_name,
    sku: r.sku,
    totalQty: Number(r.total_qty),
    totalCost: Number(r.total_cost),
  })));
});

// ── Stock Movements ───────────────────────────────────────────────────────────

router.get("/reports/stock-movements", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const rows = await xr(sql`
    SELECT
      im.id,
      im.type,
      im.quantity,
      im.notes,
      im.created_at,
      p.name as product_name,
      p.sku
    FROM inventory_movements im
    JOIN products p ON p.id = im.product_id
    WHERE im.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    ORDER BY im.created_at DESC
    LIMIT 500
  `);
  res.json(rows.map(r => ({
    id: Number(r.id),
    type: r.type,
    quantity: Number(r.quantity),
    notes: r.notes,
    createdAt: r.created_at,
    productName: r.product_name,
    sku: r.sku,
  })));
});

// ── Receivables ───────────────────────────────────────────────────────────────

router.get("/reports/receivables", requireAuth, async (_req, res): Promise<void> => {
  const [rows, [totals]] = await Promise.all([
    xr(sql`
      SELECT id, name, phone, email, balance::numeric as balance, total_orders, total_spent::numeric as total_spent
      FROM customers WHERE balance::numeric > 0 ORDER BY balance::numeric DESC
    `),
    xr(sql`
      SELECT count(*) as total_customers, coalesce(sum(balance::numeric), 0) as total_receivable
      FROM customers WHERE balance::numeric > 0
    `),
  ]);

  res.json({
    totalCustomers: Number(totals?.total_customers ?? 0),
    totalReceivable: Number(totals?.total_receivable ?? 0),
    rows: rows.map(r => ({
      id: Number(r.id), name: r.name, phone: r.phone, email: r.email,
      balance: Number(r.balance), totalOrders: Number(r.total_orders), totalSpent: Number(r.total_spent),
    })),
  });
});

// ── Payables ──────────────────────────────────────────────────────────────────

router.get("/reports/payables", requireAuth, async (_req, res): Promise<void> => {
  const [rows, [totals]] = await Promise.all([
    xr(sql`
      SELECT id, name, company, phone, email, balance::numeric as balance
      FROM suppliers WHERE balance::numeric > 0 ORDER BY balance::numeric DESC
    `),
    xr(sql`
      SELECT count(*) as total_suppliers, coalesce(sum(balance::numeric), 0) as total_payable
      FROM suppliers WHERE balance::numeric > 0
    `),
  ]);

  res.json({
    totalSuppliers: Number(totals?.total_suppliers ?? 0),
    totalPayable: Number(totals?.total_payable ?? 0),
    rows: rows.map(r => ({
      id: Number(r.id), name: r.name, company: r.company, phone: r.phone, email: r.email,
      balance: Number(r.balance),
    })),
  });
});

// ── Expense Summary ───────────────────────────────────────────────────────────

router.get("/reports/expenses-summary", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const [categories, rows, [totals]] = await Promise.all([
    xr(sql`
      SELECT category, count(*) as count, coalesce(sum(amount::numeric), 0) as total
      FROM expenses
      WHERE date::date BETWEEN ${startDate}::date AND ${endDate}::date
      GROUP BY category ORDER BY total DESC
    `),
    xr(sql`
      SELECT id, title, category, amount::numeric as amount, date, notes
      FROM expenses
      WHERE date::date BETWEEN ${startDate}::date AND ${endDate}::date
      ORDER BY date DESC, created_at DESC
    `),
    xr(sql`
      SELECT coalesce(sum(amount::numeric), 0) as total, count(*) as count
      FROM expenses
      WHERE date::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
  ]);

  res.json({
    totalAmount: Number(totals?.total ?? 0),
    totalCount: Number(totals?.count ?? 0),
    categories: categories.map(c => ({ category: c.category, count: Number(c.count), total: Number(c.total) })),
    rows: rows.map(r => ({
      id: Number(r.id), title: r.title, category: r.category,
      amount: Number(r.amount), date: r.date, notes: r.notes,
    })),
  });
});

// ── Salary Report ─────────────────────────────────────────────────────────────

router.get("/reports/salary", requireAuth, async (_req, res): Promise<void> => {
  const employees = await db.select({
    id: employeesTable.id,
    employeeId: employeesTable.employeeId,
    name: employeesTable.name,
    role: employeesTable.role,
    salary: employeesTable.salary,
    status: employeesTable.status,
    joiningDate: employeesTable.joiningDate,
  }).from(employeesTable).orderBy(employeesTable.name);

  const rows = employees.map(e => ({
    id: e.id, employeeId: e.employeeId, name: e.name, role: e.role,
    salary: Number(e.salary), status: e.status, joiningDate: e.joiningDate,
  }));

  res.json({
    totalEmployees: rows.length,
    activeEmployees: rows.filter(e => e.status === "active").length,
    totalMonthlySalary: rows.filter(e => e.status === "active").reduce((s, e) => s + e.salary, 0),
    rows,
  });
});

// ── Cash Handling ─────────────────────────────────────────────────────────────

router.get("/reports/cash-handling", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const [methods, [totals], creditRows] = await Promise.all([
    xr(sql`
      SELECT payment_method, count(*) as count,
        coalesce(sum(total_amount::numeric), 0) as total,
        coalesce(sum(paid_amount::numeric), 0) as collected,
        coalesce(sum(due_amount::numeric), 0) as outstanding
      FROM sales
      WHERE is_return = false AND created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      GROUP BY payment_method ORDER BY total DESC
    `),
    xr(sql`
      SELECT
        coalesce(sum(total_amount::numeric), 0) as total_sales,
        coalesce(sum(paid_amount::numeric), 0) as total_collected,
        coalesce(sum(due_amount::numeric), 0) as total_due,
        count(*) as total_transactions
      FROM sales
      WHERE is_return = false AND created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
    xr(sql`
      SELECT s.invoice_number, s.created_at,
        s.total_amount::numeric as total, s.paid_amount::numeric as paid, s.due_amount::numeric as due,
        coalesce((select name from customers where id = s.customer_id), 'Walk-in') as customer_name
      FROM sales s
      WHERE s.is_return = false AND s.due_amount::numeric > 0
        AND s.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      ORDER BY s.due_amount::numeric DESC LIMIT 100
    `),
  ]);

  res.json({
    totalSales: Number(totals?.total_sales ?? 0),
    totalCollected: Number(totals?.total_collected ?? 0),
    totalDue: Number(totals?.total_due ?? 0),
    totalTransactions: Number(totals?.total_transactions ?? 0),
    byMethod: methods.map(m => ({
      paymentMethod: m.payment_method, count: Number(m.count), total: Number(m.total),
      collected: Number(m.collected), outstanding: Number(m.outstanding),
    })),
    creditSales: creditRows.map(r => ({
      invoiceNumber: r.invoice_number, createdAt: r.created_at, customerName: r.customer_name,
      total: Number(r.total), paid: Number(r.paid), due: Number(r.due),
    })),
  });
});

// ── Business Analysis ─────────────────────────────────────────────────────────

router.get("/reports/business-analysis", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);

  const [[sales], [purchasesRow], [expensesRow], [cogs], [returns], topProducts] = await Promise.all([
    xr(sql`
      SELECT
        coalesce(sum(total_amount::numeric), 0) as revenue,
        coalesce(sum(discount::numeric), 0) as discounts,
        count(*) as orders,
        count(distinct customer_id) as unique_customers,
        coalesce(avg(total_amount::numeric), 0) as avg_order_value
      FROM sales
      WHERE is_return = false AND created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
    xr(sql`
      SELECT coalesce(sum(total_amount::numeric), 0) as total
      FROM purchases WHERE created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
    xr(sql`
      SELECT coalesce(sum(amount::numeric), 0) as total
      FROM expenses WHERE date::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
    xr(sql`
      SELECT coalesce(sum(si.quantity * p.cost_price::numeric), 0) as cogs
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN sales s ON s.id = si.sale_id
      WHERE s.is_return = false AND s.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
    xr(sql`
      SELECT coalesce(sum(total_amount::numeric), 0) as total, count(*) as count
      FROM sales WHERE is_return = true AND created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
    `),
    xr(sql`
      SELECT p.name, coalesce(sum(si.quantity), 0) as qty,
        coalesce(sum(si.quantity * si.price::numeric - si.discount::numeric), 0) as revenue
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN sales s ON s.id = si.sale_id
      WHERE s.is_return = false AND s.created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      GROUP BY p.name ORDER BY revenue DESC LIMIT 5
    `),
  ]);

  const revenue = Number(sales?.revenue ?? 0);
  const cogsVal = Number(cogs?.cogs ?? 0);
  const expensesVal = Number(expensesRow?.total ?? 0);
  const grossProfit = revenue - cogsVal;
  const netProfit = grossProfit - expensesVal;

  res.json({
    revenue, discounts: Number(sales?.discounts ?? 0),
    orders: Number(sales?.orders ?? 0),
    uniqueCustomers: Number(sales?.unique_customers ?? 0),
    avgOrderValue: Number(sales?.avg_order_value ?? 0),
    purchases: Number(purchasesRow?.total ?? 0),
    expenses: expensesVal, cogs: cogsVal, grossProfit, netProfit,
    grossMargin: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : "0",
    netMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : "0",
    returnsTotal: Number(returns?.total ?? 0),
    returnsCount: Number(returns?.count ?? 0),
    topProducts: topProducts.map(p => ({ name: p.name, qty: Number(p.qty), revenue: Number(p.revenue) })),
  });
});

// ── Expiry & Return Reports ───────────────────────────────────────────────────

router.get("/reports/expiry-products", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await xr(sql`
    SELECT
      p.id, p.name, p.sku, p.batch_number, p.mfg_date, p.expiry_date,
      p.stock, p.cost_price::numeric as cost_price, p.sale_price::numeric as sale_price,
      (select name from categories where id = p.category_id) as category_name,
      CASE
        WHEN p.expiry_date IS NULL OR p.expiry_date !~ '^\d{4}-\d{2}-\d{2}$' THEN 'no_expiry'
        WHEN p.expiry_date::date < current_date THEN 'expired'
        WHEN p.expiry_date::date <= current_date + interval '7 days' THEN 'critical'
        WHEN p.expiry_date::date <= current_date + interval '15 days' THEN 'warning'
        WHEN p.expiry_date::date <= current_date + interval '30 days' THEN 'near'
        ELSE 'ok'
      END as expiry_status,
      CASE
        WHEN p.expiry_date IS NOT NULL AND p.expiry_date ~ '^\d{4}-\d{2}-\d{2}$'
        THEN (p.expiry_date::date - current_date)
        ELSE NULL
      END as days_to_expiry
    FROM products p
    WHERE p.status = 'active'
    ORDER BY
      CASE WHEN p.expiry_date IS NULL OR p.expiry_date !~ '^\d{4}-\d{2}-\d{2}$' THEN 2 ELSE 1 END,
      p.expiry_date ASC NULLS LAST
  `);
  res.json(rows.map(r => ({
    id: Number(r.id), name: r.name, sku: r.sku,
    batchNumber: r.batch_number ?? null, mfgDate: r.mfg_date ?? null, expiryDate: r.expiry_date ?? null,
    stock: Number(r.stock), costPrice: Number(r.cost_price), salePrice: Number(r.sale_price),
    categoryName: r.category_name ?? null,
    expiryStatus: r.expiry_status,
    daysToExpiry: r.days_to_expiry !== null ? Number(r.days_to_expiry) : null,
    stockValue: Number(r.stock) * Number(r.cost_price),
  })));
  void today;
});

router.get("/reports/return-reasons", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = dateRange(req);
  const [customerRows, supplierRows] = await Promise.all([
    xr(sql`
      SELECT
        coalesce(return_reason, 'not_specified') as reason,
        count(*) as count,
        coalesce(sum(total_amount::numeric), 0) as total_value
      FROM sales
      WHERE is_return = true AND created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      GROUP BY return_reason ORDER BY count DESC
    `),
    xr(sql`
      SELECT
        coalesce(return_reason, 'not_specified') as reason,
        count(*) as count,
        coalesce(sum(total_amount::numeric), 0) as total_value
      FROM purchase_returns
      WHERE created_at::date BETWEEN ${startDate}::date AND ${endDate}::date
      GROUP BY return_reason ORDER BY count DESC
    `),
  ]);
  res.json({
    customerReturns: customerRows.map(r => ({
      reason: r.reason, count: Number(r.count), totalValue: Number(r.total_value),
    })),
    supplierReturns: supplierRows.map(r => ({
      reason: r.reason, count: Number(r.count), totalValue: Number(r.total_value),
    })),
  });
});

export default router;

