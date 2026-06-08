import { Router } from "express";
import { randomBytes } from "crypto";
import { eq, and, like, or, sql, gte, lte, desc, inArray, isNull } from "drizzle-orm";
import {
  db,
  productsTable,
  categoriesTable,
  brandsTable,
  customersTable,
  ordersTable,
  orderItemsTable,
  settingsTable,
  inventoryMovementsTable,
  businessConfigTable,
} from "@workspace/db";
import {
  signCustomerToken,
  verifyCustomerToken,
  hashPassword,
  comparePassword,
} from "../lib/auth.js";
import { requireCustomerAuth, optionalCustomerAuth } from "../middlewares/auth.js";

const router = Router();

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmtProduct(p: any) {
  return {
    ...p,
    costPrice: Number(p.costPrice),
    salePrice: Number(p.salePrice),
    discountPrice: p.discountPrice != null ? Number(p.discountPrice) : null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

function fmtOrder(o: any) {
  return {
    ...o,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    tax: Number(o.tax),
    totalAmount: Number(o.totalAmount),
    paidAmount: Number(o.paidAmount),
    dueAmount: Number(o.dueAmount),
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
  };
}

async function getStoreOrderWithItems(orderId: number) {
  const [order] = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      customerId: ordersTable.customerId,
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
      customerToken: ordersTable.customerToken,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));
  if (!order) return null;

  const items = await db
    .select({
      id: orderItemsTable.id,
      productId: orderItemsTable.productId,
      productName: sql<string | null>`(select name from products where id = order_items.product_id)`,
      quantity: orderItemsTable.quantity,
      price: orderItemsTable.price,
      discount: orderItemsTable.discount,
    })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  return {
    ...fmtOrder(order),
    items: items.map((i) => ({ ...i, price: Number(i.price), discount: Number(i.discount) })),
  };
}

// The active (primary) business type. When set, the storefront and customer app
// only show products belonging to it; products with no business_type are always
// shown so untagged/manually-added items never silently disappear.
async function getPrimaryBusinessType(): Promise<string | null> {
  const [row] = await db
    .select({ primary: businessConfigTable.primaryBusinessType })
    .from(businessConfigTable)
    .where(eq(businessConfigTable.id, 1));
  return row?.primary ?? null;
}

function businessCondition(primary: string | null) {
  if (!primary) return undefined;
  return or(eq(productsTable.businessType, primary), isNull(productsTable.businessType));
}

function parseWishlist(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "number") : [];
  } catch {
    return [];
  }
}

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

router.get("/store/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable);
  if (!settings) {
    const [{ id: newId }] = await db.insert(settingsTable).values({}).$returningId();
    [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, newId));
  }
  res.json({
    storeName: settings.storeName,
    storePhone: settings.storePhone,
    storeEmail: settings.storeEmail,
    storeAddress: settings.storeAddress,
    currency: settings.currency,
    taxRate: Number(settings.taxRate),
    logoUrl: settings.logoUrl,
    companyName: settings.companyName,
    bankName: settings.bankName,
    bankAccountTitle: settings.bankAccountTitle,
    bankAccount: settings.bankAccount,
    bankIban: settings.bankIban,
    jazzcashNumber: settings.jazzcashNumber,
    easypaisaNumber: settings.easypaisaNumber,
    qrCodeUrl: settings.qrCodeUrl,
  });
});

router.get("/store/products", async (req, res): Promise<void> => {
  const { search, categoryId, brandId, minPrice, maxPrice, page, limit } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit ?? "20", 10) || 20));
  const offset = (pageNum - 1) * pageSize;

  const conditions = [eq(productsTable.status, "active")];

  const bizCond = businessCondition(await getPrimaryBusinessType());
  if (bizCond) conditions.push(bizCond);

  if (search) {
    const q = `%${search}%`;
    conditions.push(or(like(productsTable.name, q), like(productsTable.sku, q))!);
  }
  if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId, 10)));
  if (brandId) conditions.push(eq(productsTable.brandId, parseInt(brandId, 10)));
  if (minPrice) conditions.push(gte(productsTable.salePrice, minPrice));
  if (maxPrice) conditions.push(lte(productsTable.salePrice, maxPrice));

  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: sql<number>`cast(count(*) as unsigned)` })
    .from(productsTable)
    .where(where);

  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      categoryId: productsTable.categoryId,
      categoryName: sql<string | null>`(select name from categories where id = products.category_id)`,
      brandId: productsTable.brandId,
      brandName: sql<string | null>`(select name from brands where id = products.brand_id)`,
      salePrice: productsTable.salePrice,
      discountPrice: productsTable.discountPrice,
      stock: productsTable.stock,
      description: productsTable.description,
      imageUrl: productsTable.imageUrl,
      unit: productsTable.unit,
      status: productsTable.status,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .where(where)
    .orderBy(desc(productsTable.stock), desc(productsTable.createdAt))
    .limit(pageSize)
    .offset(offset);

  res.json({
    data: products.map(fmtProduct),
    total,
    page: pageNum,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

router.get("/store/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid product id" }); return; }

  const bizCond = businessCondition(await getPrimaryBusinessType());

  const [product] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      barcode: productsTable.barcode,
      categoryId: productsTable.categoryId,
      categoryName: sql<string | null>`(select name from categories where id = products.category_id)`,
      brandId: productsTable.brandId,
      brandName: sql<string | null>`(select name from brands where id = products.brand_id)`,
      costPrice: productsTable.costPrice,
      salePrice: productsTable.salePrice,
      discountPrice: productsTable.discountPrice,
      stock: productsTable.stock,
      lowStockLimit: productsTable.lowStockLimit,
      description: productsTable.description,
      imageUrl: productsTable.imageUrl,
      status: productsTable.status,
      unit: productsTable.unit,
      mfgDate: productsTable.mfgDate,
      expiryDate: productsTable.expiryDate,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.status, "active"), ...(bizCond ? [bizCond] : [])));

  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(fmtProduct(product));
});

router.get("/store/categories", async (_req, res): Promise<void> => {
  const primary = await getPrimaryBusinessType();
  const bizSql = primary
    ? sql` and (business_type = ${primary} or business_type is null)`
    : sql``;

  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      productCount: sql<number>`(select cast(count(*) as unsigned) from products where category_id = categories.id and status = 'active'${bizSql})`,
      createdAt: categoriesTable.createdAt,
    })
    .from(categoriesTable)
    .orderBy(categoriesTable.name);

  // When a business is active, hide categories that have no products in it so the
  // storefront filter only lists categories relevant to the active business.
  const visible = primary ? categories.filter((c) => c.productCount > 0) : categories;

  res.json(
    visible.map((c) => ({
      ...c,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    }))
  );
});

router.get("/store/brands", async (_req, res): Promise<void> => {
  const brands = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      description: brandsTable.description,
      productCount: sql<number>`(select cast(count(*) as unsigned) from products where brand_id = brands.id and status = 'active')`,
      createdAt: brandsTable.createdAt,
    })
    .from(brandsTable)
    .orderBy(brandsTable.name);

  res.json(
    brands.map((b) => ({
      ...b,
      createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
    }))
  );
});

router.get("/store/featured", async (_req, res): Promise<void> => {
  const productFields = {
    id: productsTable.id,
    name: productsTable.name,
    sku: productsTable.sku,
    categoryId: productsTable.categoryId,
    categoryName: sql<string | null>`(select name from categories where id = products.category_id)`,
    brandId: productsTable.brandId,
    brandName: sql<string | null>`(select name from brands where id = products.brand_id)`,
    salePrice: productsTable.salePrice,
    discountPrice: productsTable.discountPrice,
    stock: productsTable.stock,
    description: productsTable.description,
    imageUrl: productsTable.imageUrl,
    unit: productsTable.unit,
    status: productsTable.status,
    createdAt: productsTable.createdAt,
  };

  const bizCond = businessCondition(await getPrimaryBusinessType());
  const activeCondition = bizCond
    ? and(eq(productsTable.status, "active"), bizCond)!
    : eq(productsTable.status, "active");

  const newArrivals = await db
    .select(productFields)
    .from(productsTable)
    .where(activeCondition)
    .orderBy(desc(productsTable.createdAt))
    .limit(10);

  const bestSelling = await db
    .select({
      ...productFields,
      totalSold: sql<number>`cast(coalesce((select sum(quantity) from order_items where product_id = products.id), 0) as unsigned)`,
    })
    .from(productsTable)
    .where(activeCondition)
    .orderBy(sql`coalesce((select sum(quantity) from order_items where product_id = products.id), 0) desc`)
    .limit(10);

  const discounted = await db
    .select(productFields)
    .from(productsTable)
    .where(and(activeCondition, sql`discount_price is not null`))
    .orderBy(desc(productsTable.createdAt))
    .limit(10);

  res.json({
    newArrivals: newArrivals.map(fmtProduct),
    bestSelling: bestSelling.map((p) => ({ ...fmtProduct(p), totalSold: p.totalSold })),
    discounted: discounted.map(fmtProduct),
  });
});

// ─── CUSTOMER AUTH ROUTES ─────────────────────────────────────────────────────

router.post("/store/auth/register", async (req, res): Promise<void> => {
  const { name, email, phone, password } = req.body ?? {};
  if (!name || !email || !phone || !password) {
    res.status(400).json({ error: "name, email, phone, and password are required" });
    return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const [existing] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(eq(customersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [{ id: newCustomerId }] = await db
    .insert(customersTable)
    .values({ name, email, phone, passwordHash })
    .$returningId();
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, newCustomerId));

  const token = signCustomerToken({ customerId: customer.id, email: customer.email!, type: "customer" });

  res.status(201).json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      totalOrders: customer.totalOrders,
      totalSpent: Number(customer.totalSpent),
      createdAt: customer.createdAt.toISOString(),
    },
  });
});

router.post("/store/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.email, email));
  if (!customer || !customer.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, customer.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signCustomerToken({ customerId: customer.id, email: customer.email!, type: "customer" });

  res.json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      totalOrders: customer.totalOrders,
      totalSpent: Number(customer.totalSpent),
      createdAt: customer.createdAt.toISOString(),
    },
  });
});

router.get("/store/auth/me", requireCustomerAuth, async (req, res): Promise<void> => {
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, req.customer!.customerId));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  res.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    totalOrders: customer.totalOrders,
    totalSpent: Number(customer.totalSpent),
    createdAt: customer.createdAt.toISOString(),
  });
});

router.put("/store/auth/me", requireCustomerAuth, async (req, res): Promise<void> => {
  const { name, phone, address, password } = req.body ?? {};
  const upd: Record<string, unknown> = {};
  if (name) upd.name = name;
  if (phone) upd.phone = phone;
  if (address !== undefined) upd.address = address;
  if (password) {
    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    upd.passwordHash = await hashPassword(password);
  }

  if (Object.keys(upd).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  await db
    .update(customersTable)
    .set(upd)
    .where(eq(customersTable.id, req.customer!.customerId));
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, req.customer!.customerId));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  res.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    totalOrders: customer.totalOrders,
    totalSpent: Number(customer.totalSpent),
    createdAt: customer.createdAt.toISOString(),
  });
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────

router.post("/store/orders", optionalCustomerAuth, async (req, res): Promise<void> => {
  const {
    items,
    paymentMethod,
    deliveryAddress,
    phone,
    name,
    notes,
    discount,
    tax,
  } = req.body ?? {};

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items is required and must be a non-empty array" });
    return;
  }
  if (!paymentMethod) {
    res.status(400).json({ error: "paymentMethod is required" });
    return;
  }
  const validPaymentMethods = ["cod", "easypaisa", "jazzcash", "bank_transfer", "cash"];
  if (!validPaymentMethods.includes(paymentMethod)) {
    res.status(400).json({ error: `paymentMethod must be one of: ${validPaymentMethods.join(", ")}` });
    return;
  }

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity < 1) {
      res.status(400).json({ error: "Each item must have productId and quantity >= 1" });
      return;
    }
  }

  const productIds: number[] = items.map((i: any) => i.productId);
  const products = await db
    .select({ id: productsTable.id, stock: productsTable.stock, salePrice: productsTable.salePrice, discountPrice: productsTable.discountPrice, status: productsTable.status })
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));

  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || product.status !== "active") {
      res.status(400).json({ error: `Product ${item.productId} not found or inactive` });
      return;
    }
    if (product.stock < item.quantity) {
      res.status(400).json({ error: `Insufficient stock for product ${item.productId}` });
      return;
    }
  }

  const orderItems = items.map((item: any) => {
    const product = productMap.get(item.productId)!;
    const price = product.discountPrice != null ? Number(product.discountPrice) : Number(product.salePrice);
    return { productId: item.productId, quantity: item.quantity, price };
  });

  const subtotal = orderItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const discountAmount = Number(discount ?? 0);
  const taxAmount = Number(tax ?? 0);
  const totalAmount = subtotal - discountAmount + taxAmount;

  const [{ maxNum }] = await db
    .select({ maxNum: sql<number>`coalesce(max(cast(substring(order_number, 5) as unsigned)), 0)` })
    .from(ordersTable)
    .where(sql`order_number like 'WEB-%'`);
  const nextNum = (maxNum ?? 0) + 1;
  const orderNumber = `WEB-${String(nextNum).padStart(4, "0")}`;

  const customerToken = !req.customer
    ? randomBytes(20).toString("hex")
    : undefined;

  let customerId = req.customer?.customerId ?? null;

  if (!customerId && (name || phone)) {
    const noteStr = [
      name ? `Name: ${name}` : null,
      phone ? `Phone: ${phone}` : null,
      deliveryAddress ? `Address: ${deliveryAddress}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const orderNotes = [noteStr, notes].filter(Boolean).join(" | ");

    const [{ id: guestOrderId }] = await db
      .insert(ordersTable)
      .values({
        orderNumber,
        customerId: null,
        deliveryMethod: "home_delivery",
        paymentMethod,
        subtotal: String(subtotal),
        discount: String(discountAmount),
        tax: String(taxAmount),
        totalAmount: String(totalAmount),
        paidAmount: "0",
        dueAmount: String(totalAmount),
        notes: orderNotes || null,
        customerToken: customerToken ?? null,
      })
      .$returningId();

    await db.insert(orderItemsTable).values(
      orderItems.map((i) => ({
        orderId: guestOrderId,
        productId: i.productId,
        quantity: i.quantity,
        price: String(i.price),
        discount: "0",
      }))
    );

    for (const item of orderItems) {
      await db
        .update(productsTable)
        .set({ stock: sql`stock - ${item.quantity}` })
        .where(eq(productsTable.id, item.productId));
      await db.insert(inventoryMovementsTable).values({
        productId: item.productId,
        type: "stock_out",
        quantity: item.quantity,
        notes: `Web order ${orderNumber}`,
      });
    }

    const result = await getStoreOrderWithItems(guestOrderId);
    res.status(201).json({ ...result, customerToken: customerToken ?? null });
    return;
  }

  const [{ id: newOrderId }] = await db
    .insert(ordersTable)
    .values({
      orderNumber,
      customerId,
      deliveryMethod: "home_delivery",
      paymentMethod,
      subtotal: String(subtotal),
      discount: String(discountAmount),
      tax: String(taxAmount),
      totalAmount: String(totalAmount),
      paidAmount: "0",
      dueAmount: String(totalAmount),
      notes: [deliveryAddress ? `Address: ${deliveryAddress}` : null, notes].filter(Boolean).join(" | ") || null,
      customerToken: customerToken ?? null,
    })
    .$returningId();

  await db.insert(orderItemsTable).values(
    orderItems.map((i) => ({
      orderId: newOrderId,
      productId: i.productId,
      quantity: i.quantity,
      price: String(i.price),
      discount: "0",
    }))
  );

  for (const item of orderItems) {
    await db
      .update(productsTable)
      .set({ stock: sql`stock - ${item.quantity}` })
      .where(eq(productsTable.id, item.productId));
    await db.insert(inventoryMovementsTable).values({
      productId: item.productId,
      type: "stock_out",
      quantity: item.quantity,
      notes: `Web order ${orderNumber}`,
    });
  }

  if (customerId) {
    await db
      .update(customersTable)
      .set({
        totalOrders: sql`total_orders + 1`,
        totalSpent: sql`total_spent + ${String(totalAmount)}`,
      })
      .where(eq(customersTable.id, customerId));
  }

  const result = await getStoreOrderWithItems(newOrderId);
  res.status(201).json({ ...result, customerToken: customerToken ?? null });
});

router.get("/store/orders", requireCustomerAuth, async (req, res): Promise<void> => {
  const orders = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      status: ordersTable.status,
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
    })
    .from(ordersTable)
    .where(eq(ordersTable.customerId, req.customer!.customerId))
    .orderBy(desc(ordersTable.createdAt));

  res.json(orders.map((o) => ({ ...fmtOrder(o), items: [] })));
});

router.get("/store/orders/:orderNumber", optionalCustomerAuth, async (req, res): Promise<void> => {
  const orderNumber = String(req.params.orderNumber);
  const { token: guestToken } = req.query as { token?: string };

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, orderNumber));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const isOwner = req.customer && order.customerId === req.customer.customerId;
  const isGuestWithToken = guestToken && order.customerToken === guestToken;

  if (!isOwner && !isGuestWithToken) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await getStoreOrderWithItems(order.id);
  res.json(result);
});

// ─── WISHLIST ──────────────────────────────────────────────────────────────────

router.get("/store/wishlist", requireCustomerAuth, async (req, res): Promise<void> => {
  const [customer] = await db
    .select({ wishlistItems: customersTable.wishlistItems })
    .from(customersTable)
    .where(eq(customersTable.id, req.customer!.customerId));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const ids = parseWishlist(customer.wishlistItems);
  if (ids.length === 0) { res.json([]); return; }

  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      salePrice: productsTable.salePrice,
      discountPrice: productsTable.discountPrice,
      stock: productsTable.stock,
      imageUrl: productsTable.imageUrl,
      unit: productsTable.unit,
      status: productsTable.status,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .where(inArray(productsTable.id, ids));

  res.json(products.map(fmtProduct));
});

router.post("/store/wishlist", requireCustomerAuth, async (req, res): Promise<void> => {
  const { productId } = req.body ?? {};
  if (!productId || typeof productId !== "number") {
    res.status(400).json({ error: "productId is required and must be a number" });
    return;
  }

  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.id, productId));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const [customer] = await db
    .select({ wishlistItems: customersTable.wishlistItems })
    .from(customersTable)
    .where(eq(customersTable.id, req.customer!.customerId));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const ids = parseWishlist(customer.wishlistItems);
  if (!ids.includes(productId)) {
    ids.push(productId);
    await db
      .update(customersTable)
      .set({ wishlistItems: JSON.stringify(ids) })
      .where(eq(customersTable.id, req.customer!.customerId));
  }

  res.json({ wishlistItems: ids });
});

router.delete("/store/wishlist/:productId", requireCustomerAuth, async (req, res): Promise<void> => {
  const productId = parseInt(String(req.params.productId), 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid productId" }); return; }

  const [customer] = await db
    .select({ wishlistItems: customersTable.wishlistItems })
    .from(customersTable)
    .where(eq(customersTable.id, req.customer!.customerId));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const ids = parseWishlist(customer.wishlistItems).filter((id) => id !== productId);
  await db
    .update(customersTable)
    .set({ wishlistItems: JSON.stringify(ids) })
    .where(eq(customersTable.id, req.customer!.customerId));

  res.json({ wishlistItems: ids });
});

export default router;
