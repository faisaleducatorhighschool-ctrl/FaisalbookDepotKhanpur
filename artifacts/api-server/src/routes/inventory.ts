import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, inventoryMovementsTable, productsTable } from "@workspace/db";
import { CreateInventoryMovementBody, ListInventoryMovementsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/inventory", requireAuth, async (req, res): Promise<void> => {
  const params = ListInventoryMovementsQueryParams.safeParse(req.query);
  let rows = await db.select({
    id: inventoryMovementsTable.id,
    productId: inventoryMovementsTable.productId,
    productName: sql<string | null>`(select name from products where id = inventory_movements.product_id)`,
    type: inventoryMovementsTable.type,
    quantity: inventoryMovementsTable.quantity,
    notes: inventoryMovementsTable.notes,
    branchId: inventoryMovementsTable.branchId,
    createdAt: inventoryMovementsTable.createdAt,
  }).from(inventoryMovementsTable).orderBy(sql`created_at desc`);

  if (params.success) {
    if (params.data.productId) rows = rows.filter(r => r.productId === Number(params.data.productId));
    if (params.data.type) rows = rows.filter(r => r.type === params.data.type);
  }

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/inventory", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateInventoryMovementBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { productId, type, quantity, notes, branchId } = parsed.data;

  // Update product stock
  const delta = (type === "stock_in") ? quantity : (type === "stock_out" ? -quantity : (type === "adjustment" ? quantity - await getProductStock(productId) : quantity));
  if (type !== "adjustment") {
    await db.execute(sql`UPDATE products SET stock = stock + ${type === "stock_in" ? quantity : -quantity} WHERE id = ${productId}`);
  } else {
    await db.execute(sql`UPDATE products SET stock = ${quantity} WHERE id = ${productId}`);
  }

  const [{ id: movementId }] = await db.insert(inventoryMovementsTable).values({
    productId,
    type,
    quantity,
    notes: notes ?? null,
    branchId: branchId ?? null,
  }).$returningId();
  const [movement] = await db.select().from(inventoryMovementsTable).where(eq(inventoryMovementsTable.id, movementId));

  res.status(201).json({
    ...movement,
    productName: null,
    createdAt: movement.createdAt.toISOString(),
  });
});

async function getProductStock(productId: number): Promise<number> {
  const [p] = await db.select({ stock: productsTable.stock }).from(productsTable).where(eq(productsTable.id, productId));
  return p?.stock ?? 0;
}

router.get("/inventory/summary", requireAuth, async (_req, res): Promise<void> => {
  const products = await db.select({
    productId: productsTable.id,
    productName: productsTable.name,
    sku: productsTable.sku,
    stock: productsTable.stock,
    lowStockLimit: productsTable.lowStockLimit,
    categoryName: sql<string | null>`(select name from categories where id = products.category_id)`,
  }).from(productsTable).orderBy(productsTable.name);

  res.json(products.map(p => ({
    ...p,
    status: p.stock <= 0 ? "out_of_stock" : p.stock <= p.lowStockLimit ? "low_stock" : "in_stock",
  })));
});

export default router;
