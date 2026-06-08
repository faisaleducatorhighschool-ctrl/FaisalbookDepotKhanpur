import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, publisherSeriesTable, bookClassesTable, bookSubjectsTable, brandsTable } from "@workspace/db";
import {
  ListPublisherSeriesQueryParams,
  CreatePublisherSeriesBody,
  UpdatePublisherSeriesParams, UpdatePublisherSeriesBody,
  DeletePublisherSeriesParams,
  CreateBookClassBody, DeleteBookClassParams,
  CreateBookSubjectBody, DeleteBookSubjectParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// ─── Publisher Series ────────────────────────────────────────────────────────

router.get("/publisher-series", requireAuth, async (req, res): Promise<void> => {
  const params = ListPublisherSeriesQueryParams.safeParse(req.query);
  let query = db
    .select({
      id: publisherSeriesTable.id,
      brandId: publisherSeriesTable.brandId,
      brandName: sql<string | null>`(select name from brands where id = publisher_series.brand_id)`,
      name: publisherSeriesTable.name,
      createdAt: publisherSeriesTable.createdAt,
    })
    .from(publisherSeriesTable)
    .$dynamic();

  if (params.success && params.data.brandId) {
    query = query.where(eq(publisherSeriesTable.brandId, Number(params.data.brandId)));
  }

  const rows = await query.orderBy(publisherSeriesTable.brandId, publisherSeriesTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/publisher-series", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePublisherSeriesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const brand = await db.select({ id: brandsTable.id }).from(brandsTable).where(eq(brandsTable.id, parsed.data.brandId));
  if (!brand.length) { res.status(400).json({ error: "Brand/publisher not found" }); return; }

  const [{ id: newId }] = await db.insert(publisherSeriesTable).values({
    brandId: parsed.data.brandId,
    name: parsed.data.name,
  }).$returningId();
  const [row] = await db.select().from(publisherSeriesTable).where(eq(publisherSeriesTable.id, newId));
  res.status(201).json({ ...row, brandName: null, createdAt: row.createdAt.toISOString() });
});

router.patch("/publisher-series/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePublisherSeriesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePublisherSeriesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  await db.update(publisherSeriesTable)
    .set({ brandId: parsed.data.brandId, name: parsed.data.name })
    .where(eq(publisherSeriesTable.id, params.data.id));
  const [row] = await db.select().from(publisherSeriesTable).where(eq(publisherSeriesTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Series not found" }); return; }
  res.json({ ...row, brandName: null, createdAt: row.createdAt.toISOString() });
});

router.delete("/publisher-series/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePublisherSeriesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(publisherSeriesTable).where(eq(publisherSeriesTable.id, params.data.id));
  res.sendStatus(204);
});

// ─── Book Classes ─────────────────────────────────────────────────────────────

router.get("/book-classes", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(bookClassesTable).orderBy(bookClassesTable.sortOrder, bookClassesTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/book-classes", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBookClassBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select({ id: bookClassesTable.id }).from(bookClassesTable).where(eq(bookClassesTable.name, parsed.data.name));
  if (existing.length) { res.status(409).json({ error: "Class already exists" }); return; }
  const [{ id: newId }] = await db.insert(bookClassesTable).values({
    name: parsed.data.name,
    sortOrder: parsed.data.sortOrder ?? 0,
  }).$returningId();
  const [row] = await db.select().from(bookClassesTable).where(eq(bookClassesTable.id, newId));
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/book-classes/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteBookClassParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(bookClassesTable).where(eq(bookClassesTable.id, params.data.id));
  res.sendStatus(204);
});

// ─── Book Subjects ────────────────────────────────────────────────────────────

router.get("/book-subjects", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(bookSubjectsTable).orderBy(bookSubjectsTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/book-subjects", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBookSubjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select({ id: bookSubjectsTable.id }).from(bookSubjectsTable).where(eq(bookSubjectsTable.name, parsed.data.name));
  if (existing.length) { res.status(409).json({ error: "Subject already exists" }); return; }
  const [{ id: newId }] = await db.insert(bookSubjectsTable).values({ name: parsed.data.name }).$returningId();
  const [row] = await db.select().from(bookSubjectsTable).where(eq(bookSubjectsTable.id, newId));
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/book-subjects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteBookSubjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(bookSubjectsTable).where(eq(bookSubjectsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
