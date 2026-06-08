import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, subcategoriesTable } from "@workspace/db";
import { CreateSubcategoryBody, UpdateSubcategoryBody, UpdateSubcategoryParams, DeleteSubcategoryParams, ListSubcategoriesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/subcategories", requireAuth, async (req, res): Promise<void> => {
  const params = ListSubcategoriesQueryParams.safeParse(req.query);
  let query = db.select({
    id: subcategoriesTable.id,
    name: subcategoriesTable.name,
    categoryId: subcategoriesTable.categoryId,
    categoryName: sql<string | null>`(select name from categories where id = subcategories.category_id)`,
    description: subcategoriesTable.description,
    productCount: sql<number>`(select count(*) from products where sub_category_id = subcategories.id)`,
    createdAt: subcategoriesTable.createdAt,
  }).from(subcategoriesTable).$dynamic();

  if (params.success && params.data.categoryId) {
    query = query.where(eq(subcategoriesTable.categoryId, Number(params.data.categoryId)));
  }

  const subs = await query.orderBy(subcategoriesTable.name);
  res.json(subs.map(s => ({ ...s, productCount: Number(s.productCount), createdAt: s.createdAt.toISOString() })));
});

router.post("/subcategories", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSubcategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [{ id: _insId }] = await db.insert(subcategoriesTable).values(parsed.data).$returningId();
  const [sub] = await db.select().from(subcategoriesTable).where(eq(subcategoriesTable.id, _insId));
  res.status(201).json({ ...sub, categoryName: null, productCount: 0, createdAt: sub.createdAt.toISOString() });
});

router.patch("/subcategories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSubcategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSubcategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(subcategoriesTable).set(parsed.data).where(eq(subcategoriesTable.id, params.data.id));
  const [sub] = await db.select().from(subcategoriesTable).where(eq(subcategoriesTable.id, params.data.id));
  if (!sub) { res.status(404).json({ error: "Subcategory not found" }); return; }
  res.json({ ...sub, categoryName: null, productCount: 0, createdAt: sub.createdAt.toISOString() });
});

router.delete("/subcategories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSubcategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(subcategoriesTable).where(eq(subcategoriesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
