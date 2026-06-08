import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { CreateUserBody, UpdateUserBody, UpdateUserParams, GetUserParams, DeleteUserParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";
import { hashPassword } from "../lib/auth.js";

const router = Router();

const fmt = (u: any) => ({
  id: u.id, username: u.username, name: u.name, email: u.email,
  role: u.role, status: u.status, branchId: u.branchId,
  createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
});

router.get("/users", requireAuth, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(users.map(fmt));
});

router.post("/users", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { username, password, name, email, role, branchId } = parsed.data;
  const passwordHash = await hashPassword(password);
  const [{ id: _insId }] = await db.insert(usersTable).values({
    username, passwordHash, name, email: email ?? null, role, branchId: branchId ?? null,
  }).$returningId();
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, _insId));
  res.status(201).json(fmt(u));
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  res.json(fmt(u));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, params.data.id));
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  res.json(fmt(u));
});

router.delete("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
