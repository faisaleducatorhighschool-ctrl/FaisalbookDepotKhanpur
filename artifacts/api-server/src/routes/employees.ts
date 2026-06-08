import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import { CreateEmployeeBody, UpdateEmployeeBody, UpdateEmployeeParams, GetEmployeeParams, DeleteEmployeeParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
const fmt = (e: any) => ({
  ...e,
  salary: Number(e.salary),
  createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  updatedAt: undefined,
});

router.get("/employees", requireAuth, async (_req, res): Promise<void> => {
  const employees = await db.select().from(employeesTable).orderBy(employeesTable.name);
  res.json(employees.map(fmt));
});

router.post("/employees", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const count = await db.$count(employeesTable);
  const empId = `EMP-${String(count + 1).padStart(4, "0")}`;
  const { username, name, phone, email, cnic, address, role, salary, joiningDate, branchId } = parsed.data;
  const [{ id: _insId }] = await db.insert(employeesTable).values({
    employeeId: empId, username: username ?? null, name, phone, email: email ?? null, cnic: cnic ?? null,
    address: address ?? null, role, salary: String(salary), joiningDate,
    branchId: branchId ?? null,
  }).$returningId();
  const [e] = await db.select().from(employeesTable).where(eq(employeesTable.id, _insId));
  res.status(201).json(fmt(e));
});

router.get("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [e] = await db.select().from(employeesTable).where(eq(employeesTable.id, params.data.id));
  if (!e) { res.status(404).json({ error: "Employee not found" }); return; }
  res.json(fmt(e));
});

router.patch("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const upd: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.salary !== undefined) upd.salary = String(parsed.data.salary);
  if (parsed.data.status !== undefined) upd.status = parsed.data.status;
  await db.update(employeesTable).set(upd).where(eq(employeesTable.id, params.data.id));
  const [e] = await db.select().from(employeesTable).where(eq(employeesTable.id, params.data.id));
  if (!e) { res.status(404).json({ error: "Employee not found" }); return; }
  res.json(fmt(e));
});

router.delete("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(employeesTable).where(eq(employeesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
