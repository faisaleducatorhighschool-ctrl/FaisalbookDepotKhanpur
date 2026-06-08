import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { CreateCategoryBody, UpdateCategoryBody, UpdateCategoryParams, DeleteCategoryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/categories", requireAuth, async (_req, res): Promise<void> => {
  const cats = await db.select({
    id: categoriesTable.id,
    name: categoriesTable.name,
    description: categoriesTable.description,
    productCount: sql<number>`(select count(*) from products where category_id = categories.id)`,
    createdAt: categoriesTable.createdAt,
  }).from(categoriesTable).orderBy(categoriesTable.name);
  res.json(cats.map(c => ({ ...c, productCount: Number(c.productCount), createdAt: c.createdAt.toISOString() })));
});

router.post("/categories", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [{ id: _insId }] = await db.insert(categoriesTable).values(parsed.data).$returningId();
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, _insId));
  res.status(201).json({ ...cat, productCount: 0, createdAt: cat.createdAt.toISOString() });
});

router.patch("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(categoriesTable).set(parsed.data).where(eq(categoriesTable.id, params.data.id));
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, params.data.id));
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.json({ ...cat, productCount: 0, createdAt: cat.createdAt.toISOString() });
});

router.delete("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
