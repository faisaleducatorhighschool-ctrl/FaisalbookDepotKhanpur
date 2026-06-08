import { Router } from "express";
import { eq, inArray, sql } from "drizzle-orm";
import { db, businessConfigTable, categoriesTable, brandsTable, productsTable, unitsTable } from "@workspace/db";
import { UpdateBusinessConfigBody, ApplyBusinessPackParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import {
  BUSINESS_PACKS,
  BUSINESS_MODULES,
  getPack,
  packToApi,
  packLabel,
  resolveEnabledModules,
  tagProductBusinessTypes,
} from "../lib/business-packs.js";

const router = Router();

type ConfigRow = typeof businessConfigTable.$inferSelect;

// Always operate on the canonical singleton (id=1). ensureSchema() guarantees it
// exists; the insert is a defensive fallback that can never create a duplicate.
async function loadConfig(): Promise<ConfigRow> {
  await db
    .insert(businessConfigTable)
    .values({ id: 1, activeBusinessTypes: [], enabledModules: {}, appliedPacks: [] })
    .onDuplicateKeyUpdate({ set: { id: sql`id` } });
  const [row] = await db.select().from(businessConfigTable).where(eq(businessConfigTable.id, 1));
  return row;
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function configResponse(row: ConfigRow) {
  return {
    activeBusinessTypes: row.activeBusinessTypes ?? [],
    primaryBusinessType: row.primaryBusinessType,
    enabledModules: resolveEnabledModules(row.enabledModules),
    appliedPacks: row.appliedPacks ?? [],
    packs: BUSINESS_PACKS.map(packToApi),
    modules: BUSINESS_MODULES,
  };
}

router.get("/business/config", requireAuth, async (_req, res): Promise<void> => {
  const row = await loadConfig();
  res.json(configResponse(row));
});

router.put("/business/config", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateBusinessConfigBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  const current = await loadConfig();
  const upd: Record<string, unknown> = {};
  if (d.activeBusinessTypes !== undefined) upd.activeBusinessTypes = uniq(d.activeBusinessTypes);
  if (d.primaryBusinessType !== undefined) upd.primaryBusinessType = d.primaryBusinessType || null;
  // Merge partial module flags into the stored map so a payload toggling one key
  // never resets the others that were previously customized.
  if (d.enabledModules !== undefined) {
    upd.enabledModules = { ...(current.enabledModules ?? {}), ...d.enabledModules };
  }

  if (Object.keys(upd).length) {
    await db.update(businessConfigTable).set(upd).where(eq(businessConfigTable.id, 1));
  }
  let [row] = await db.select().from(businessConfigTable).where(eq(businessConfigTable.id, 1));
  if (!row) [row] = await db.select().from(businessConfigTable).where(eq(businessConfigTable.id, 1));

  res.json(configResponse(row));
});

router.get("/business/modules", requireAuth, async (_req, res): Promise<void> => {
  const row = await loadConfig();
  const primary = row.primaryBusinessType;
  res.json({
    enabledModules: resolveEnabledModules(row.enabledModules),
    primaryBusinessType: primary,
    primaryBusinessLabel: packLabel(primary),
    primaryWidgets: primary ? getPack(primary)?.dashboardWidgets ?? [] : [],
  });
});

// Apply a pack's master data. Idempotent: categories/brands/units are inserted by
// unique name, sample products by unique sku — re-applying inserts nothing new.
router.post("/business/packs/:key/apply", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = ApplyBusinessPackParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const pack = getPack(params.data.key);
  if (!pack) { res.status(404).json({ error: "Business pack not found" }); return; }

  const applied = { categories: 0, brands: 0, units: 0, products: 0 };

  // Categories
  if (pack.categories.length) {
    const names = pack.categories.map((c) => c.name);
    await db.insert(categoriesTable)
      .values(pack.categories.map((c) => ({ name: c.name, description: c.description ?? null })))
      .onDuplicateKeyUpdate({ set: { id: sql`id` } });
    const inserted = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(inArray(categoriesTable.name, names));
    applied.categories = inserted.length;
  }
  // Brands
  if (pack.brands.length) {
    const names = pack.brands.map((b) => b.name);
    await db.insert(brandsTable)
      .values(pack.brands.map((b) => ({ name: b.name, description: b.description ?? null })))
      .onDuplicateKeyUpdate({ set: { id: sql`id` } });
    const inserted = await db.select({ id: brandsTable.id }).from(brandsTable).where(inArray(brandsTable.name, names));
    applied.brands = inserted.length;
  }
  // Units
  if (pack.units.length) {
    await db.insert(unitsTable)
      .values(pack.units.map((name) => ({ name })))
      .onDuplicateKeyUpdate({ set: { id: sql`id` } });
    const inserted = await db.select({ id: unitsTable.id }).from(unitsTable).where(inArray(unitsTable.name, pack.units));
    applied.units = inserted.length;
  }

  // Sample products — resolve category/brand names to ids (works whether the rows
  // were just inserted or already existed).
  if (pack.sampleProducts.length) {
    const catNames = uniq(pack.sampleProducts.map((p) => p.categoryName).filter((n): n is string => !!n));
    const brandNames = uniq(pack.sampleProducts.map((p) => p.brandName).filter((n): n is string => !!n));
    const catRows = catNames.length
      ? await db.select({ id: categoriesTable.id, name: categoriesTable.name }).from(categoriesTable).where(inArray(categoriesTable.name, catNames))
      : [];
    const brandRows = brandNames.length
      ? await db.select({ id: brandsTable.id, name: brandsTable.name }).from(brandsTable).where(inArray(brandsTable.name, brandNames))
      : [];
    const catMap = new Map(catRows.map((r) => [r.name, r.id]));
    const brandMap = new Map(brandRows.map((r) => [r.name, r.id]));

    await db.insert(productsTable)
      .values(pack.sampleProducts.map((p) => ({
        name: p.name,
        sku: p.sku,
        businessType: pack.key,
        categoryId: p.categoryName ? catMap.get(p.categoryName) ?? null : null,
        brandId: p.brandName ? brandMap.get(p.brandName) ?? null : null,
        costPrice: String(p.costPrice ?? 0),
        salePrice: String(p.salePrice),
        stock: p.stock ?? 0,
        lowStockLimit: p.lowStockLimit ?? 10,
        unit: p.unit ?? "PCS",
      })))
      .onDuplicateKeyUpdate({ set: { id: sql`id` } });
    const skus = pack.sampleProducts.map((p) => p.sku);
    const inserted = await db.select({ id: productsTable.id }).from(productsTable).where(inArray(productsTable.sku, skus));
    applied.products = inserted.length;
  }

  // Mark pack active + applied; set as primary if none chosen yet.
  const row = await loadConfig();
  const activeBusinessTypes = uniq([...(row.activeBusinessTypes ?? []), pack.key]);
  const appliedPacks = uniq([...(row.appliedPacks ?? []), pack.key]);
  const primaryBusinessType = row.primaryBusinessType ?? pack.key;
  await db.update(businessConfigTable)
    .set({ activeBusinessTypes, appliedPacks, primaryBusinessType })
    .where(eq(businessConfigTable.id, 1));

  // Stamp every product with its owning business type so the store / customer
  // app can filter to the active business (also covers legacy base-seed data).
  await tagProductBusinessTypes();

  res.json({ key: pack.key, applied });
});

export { router as businessRouter };
export default router;
