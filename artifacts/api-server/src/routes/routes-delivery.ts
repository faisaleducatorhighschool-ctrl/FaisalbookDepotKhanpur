import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, deliveryRoutesTable, deliveryAssignmentsTable } from "@workspace/db";
import { CreateRouteBody, UpdateRouteBody, UpdateRouteParams, DeleteRouteParams, CreateDeliveryBody, UpdateDeliveryBody, UpdateDeliveryParams, ListDeliveriesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// ROUTES
router.get("/routes", requireAuth, async (_req, res): Promise<void> => {
  const routes = await db.select({
    id: deliveryRoutesTable.id,
    name: deliveryRoutesTable.name,
    area: deliveryRoutesTable.area,
    vehicle: deliveryRoutesTable.vehicle,
    employeeId: deliveryRoutesTable.employeeId,
    employeeName: sql<string | null>`(select name from employees where id = delivery_routes.employee_id)`,
    deliveryDate: deliveryRoutesTable.deliveryDate,
    status: deliveryRoutesTable.status,
    createdAt: deliveryRoutesTable.createdAt,
  }).from(deliveryRoutesTable).orderBy(sql`created_at desc`);
  res.json(routes.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/routes", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRouteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, area, vehicle, employeeId, deliveryDate } = parsed.data;
  const [{ id: _insId }] = await db.insert(deliveryRoutesTable).values({
    name, area, vehicle: vehicle ?? null, employeeId: employeeId ?? null, deliveryDate: deliveryDate ?? null,
  }).$returningId();
  const [route] = await db.select().from(deliveryRoutesTable).where(eq(deliveryRoutesTable.id, _insId));
  res.status(201).json({ ...route, employeeName: null, createdAt: route.createdAt.toISOString() });
});

router.patch("/routes/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateRouteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRouteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(deliveryRoutesTable).set(parsed.data).where(eq(deliveryRoutesTable.id, params.data.id));
  const [route] = await db.select().from(deliveryRoutesTable).where(eq(deliveryRoutesTable.id, params.data.id));
  if (!route) { res.status(404).json({ error: "Route not found" }); return; }
  res.json({ ...route, employeeName: null, createdAt: route.createdAt.toISOString() });
});

router.delete("/routes/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteRouteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(deliveryRoutesTable).where(eq(deliveryRoutesTable.id, params.data.id));
  res.sendStatus(204);
});

// DELIVERY ASSIGNMENTS
router.get("/deliveries", requireAuth, async (req, res): Promise<void> => {
  const params = ListDeliveriesQueryParams.safeParse(req.query);
  let rows = await db.select({
    id: deliveryAssignmentsTable.id,
    orderId: deliveryAssignmentsTable.orderId,
    orderNumber: sql<string | null>`(select order_number from orders where id = delivery_assignments.order_id)`,
    employeeId: deliveryAssignmentsTable.employeeId,
    employeeName: sql<string | null>`(select name from employees where id = delivery_assignments.employee_id)`,
    routeId: deliveryAssignmentsTable.routeId,
    status: deliveryAssignmentsTable.status,
    deliveredAt: deliveryAssignmentsTable.deliveredAt,
    notes: deliveryAssignmentsTable.notes,
    createdAt: deliveryAssignmentsTable.createdAt,
  }).from(deliveryAssignmentsTable).orderBy(sql`created_at desc`);
  if (params.success) {
    if (params.data.status) rows = rows.filter(r => r.status === params.data.status);
    if (params.data.employeeId) rows = rows.filter(r => r.employeeId === Number(params.data.employeeId));
  }
  res.json(rows.map(r => ({
    ...r,
    deliveredAt: r.deliveredAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/deliveries", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDeliveryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { orderId, employeeId, routeId, notes } = parsed.data;
  const [{ id: _insId }] = await db.insert(deliveryAssignmentsTable).values({
    orderId, employeeId, routeId: routeId ?? null, notes: notes ?? null,
  }).$returningId();
  const [d] = await db.select().from(deliveryAssignmentsTable).where(eq(deliveryAssignmentsTable.id, _insId));
  res.status(201).json({ ...d, orderNumber: null, employeeName: null, deliveredAt: null, createdAt: d.createdAt.toISOString() });
});

router.patch("/deliveries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateDeliveryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDeliveryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const upd: Record<string, unknown> = {};
  if (parsed.data.status) upd.status = parsed.data.status;
  if (parsed.data.notes !== undefined) upd.notes = parsed.data.notes;
  if (parsed.data.deliveredAt !== undefined) upd.deliveredAt = parsed.data.deliveredAt;
  await db.update(deliveryAssignmentsTable).set(upd).where(eq(deliveryAssignmentsTable.id, params.data.id));
  const [d] = await db.select().from(deliveryAssignmentsTable).where(eq(deliveryAssignmentsTable.id, params.data.id));
  if (!d) { res.status(404).json({ error: "Delivery not found" }); return; }
  res.json({ ...d, orderNumber: null, employeeName: null, deliveredAt: d.deliveredAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString() });
});

export default router;
