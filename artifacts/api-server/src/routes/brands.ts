import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import { CreateBrandBody, UpdateBrandBody, UpdateBrandParams, DeleteBrandParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/brands", requireAuth, async (_req, res): Promise<void> => {
  const brands = await db.select({
    id: brandsTable.id,
    name: brandsTable.name,
    description: brandsTable.description,
    productCount: sql<number>`(select count(*) from products where brand_id = brands.id)`,
    createdAt: brandsTable.createdAt,
  }).from(brandsTable).orderBy(brandsTable.name);
  res.json(brands.map(b => ({ ...b, productCount: Number(b.productCount), createdAt: b.createdAt.toISOString() })));
});

router.post("/brands", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [{ id: _insId }] = await db.insert(brandsTable).values(parsed.data).$returningId();
  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, _insId));
  res.status(201).json({ ...brand, productCount: 0, createdAt: brand.createdAt.toISOString() });
});

router.patch("/brands/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateBrandParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateBrandBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(brandsTable).set(parsed.data).where(eq(brandsTable.id, params.data.id));
  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, params.data.id));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }
  res.json({ ...brand, productCount: 0, createdAt: brand.createdAt.toISOString() });
});

router.delete("/brands/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteBrandParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(brandsTable).where(eq(brandsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
