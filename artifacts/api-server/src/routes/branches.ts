import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, branchesTable } from "@workspace/db";
import { CreateBranchBody, UpdateBranchBody, UpdateBranchParams, DeleteBranchParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/branches/public", async (_req, res): Promise<void> => {
  const branches = await db
    .select({ id: branchesTable.id, name: branchesTable.name, isMain: branchesTable.isMain })
    .from(branchesTable)
    .where(eq(branchesTable.status, "active"))
    .orderBy(branchesTable.isMain, branchesTable.name);
  res.json(branches);
});

router.get("/branches", requireAuth, async (_req, res): Promise<void> => {
  const branches = await db.select().from(branchesTable).orderBy(branchesTable.name);
  res.json(branches.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })));
});

router.post("/branches", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBranchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, address, phone, email, isMain } = parsed.data;
  const [{ id: _insId }] = await db.insert(branchesTable).values({ name, address, phone: phone ?? null, email: email ?? null, isMain: isMain ?? false }).$returningId();
  const [b] = await db.select().from(branchesTable).where(eq(branchesTable.id, _insId));
  res.status(201).json({ ...b, createdAt: b.createdAt.toISOString() });
});

router.patch("/branches/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateBranchParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateBranchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(branchesTable).set(parsed.data).where(eq(branchesTable.id, params.data.id));
  const [b] = await db.select().from(branchesTable).where(eq(branchesTable.id, params.data.id));
  if (!b) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json({ ...b, createdAt: b.createdAt.toISOString() });
});

router.delete("/branches/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteBranchParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(branchesTable).where(eq(branchesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
