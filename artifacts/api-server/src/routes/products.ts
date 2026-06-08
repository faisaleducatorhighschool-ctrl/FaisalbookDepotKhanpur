import { Router } from "express";
import { eq, like, and, lte, sql, or } from "drizzle-orm";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, productsTable, categoriesTable, subcategoriesTable, branchesTable, brandsTable, publisherSeriesTable, bookClassesTable, bookSubjectsTable, businessConfigTable } from "@workspace/db";
import { CreateProductBody, UpdateProductBody, UpdateProductParams, GetProductParams, DeleteProductParams, ListProductsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";
import { ObjectStorageService } from "../lib/objectStorage.js";

const objectStorageService = new ObjectStorageService();

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// New products are stamped with the active business type so they show up in that
// business's store / customer app. Null when no business is selected yet.
async function getPrimaryBusinessType(): Promise<string | null> {
  const [row] = await db
    .select({ primary: businessConfigTable.primaryBusinessType })
    .from(businessConfigTable)
    .where(eq(businessConfigTable.id, 1));
  return row?.primary ?? null;
}

function mapProduct(p: any) {
  return {
    ...p,
    costPrice: Number(p.costPrice),
    salePrice: Number(p.salePrice),
    discountPrice: p.discountPrice != null ? Number(p.discountPrice) : null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

const productSelect = {
  id: productsTable.id,
  name: productsTable.name,
  sku: productsTable.sku,
  barcode: productsTable.barcode,
  isbn: productsTable.isbn,
  categoryId: productsTable.categoryId,
  categoryName: sql<string | null>`(select name from categories where id = products.category_id)`,
  subCategoryId: productsTable.subCategoryId,
  subCategoryName: sql<string | null>`(select name from subcategories where id = products.sub_category_id)`,
  branchId: productsTable.branchId,
  branchName: sql<string | null>`(select name from branches where id = products.branch_id)`,
  callNumber: productsTable.callNumber,
  brandId: productsTable.brandId,
  brandName: sql<string | null>`(select name from brands where id = products.brand_id)`,
  seriesId: productsTable.seriesId,
  seriesName: sql<string | null>`(select name from publisher_series where id = products.series_id)`,
  classId: productsTable.classId,
  className: sql<string | null>`(select name from book_classes where id = products.class_id)`,
  subjectId: productsTable.subjectId,
  subjectName: sql<string | null>`(select name from book_subjects where id = products.subject_id)`,
  author: productsTable.author,
  edition: productsTable.edition,
  costPrice: productsTable.costPrice,
  salePrice: productsTable.salePrice,
  discountPrice: productsTable.discountPrice,
  stock: productsTable.stock,
  lowStockLimit: productsTable.lowStockLimit,
  description: productsTable.description,
  imageUrl: productsTable.imageUrl,
  status: productsTable.status,
  unit: productsTable.unit,
  batchNumber: productsTable.batchNumber,
  mfgDate: productsTable.mfgDate,
  expiryDate: productsTable.expiryDate,
  createdAt: productsTable.createdAt,
};

router.get("/products", requireAuth, async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  let query = db.select(productSelect).from(productsTable).$dynamic();

  const conditions = [];
  if (params.success) {
    if (params.data.search) {
      const q = `%${params.data.search}%`;
      conditions.push(or(
        like(productsTable.name, q),
        like(productsTable.sku, q),
        like(productsTable.barcode, q)
      )!);
    }
    if (params.data.categoryId) conditions.push(eq(productsTable.categoryId, Number(params.data.categoryId)));
    if (params.data.brandId) conditions.push(eq(productsTable.brandId, Number(params.data.brandId)));
    if (params.data.status) conditions.push(eq(productsTable.status, params.data.status));
  }
  if (conditions.length) query = query.where(and(...conditions));

  const products = await query.orderBy(sql`created_at desc`);
  res.json(products.map(mapProduct));
});

// Export must be before /:id to avoid route conflict
router.get("/products/export", requireAuth, async (req, res): Promise<void> => {
  const products = await db.select(productSelect).from(productsTable).orderBy(productsTable.name);

  const rows = products.map(p => ({
    SKU: p.sku,
    Barcode: p.barcode ?? "",
    ISBN: p.isbn ?? "",
    Name: p.name,
    Category: p.categoryName ?? "",
    "Sub Category": p.subCategoryName ?? "",
    Branch: p.branchName ?? "",
    "Call Number": p.callNumber ?? "",
    Publisher: p.brandName ?? "",
    Series: p.seriesName ?? "",
    Class: p.className ?? "",
    Subject: p.subjectName ?? "",
    Author: p.author ?? "",
    Edition: p.edition ?? "",
    "Cost Price": Number(p.costPrice),
    "Sale Price": Number(p.salePrice),
    "Discount Price": p.discountPrice != null ? Number(p.discountPrice) : "",
    Stock: p.stock,
    "Low Stock Limit": p.lowStockLimit,
    Unit: p.unit,
    Status: p.status,
    "Batch Number": p.batchNumber ?? "",
    "Mfg Date": p.mfgDate ?? "",
    "Expiry Date": p.expiryDate ?? "",
    Description: p.description ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", `attachment; filename="products-${Date.now()}.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

router.post("/products/import", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const wb = XLSX.read(req.file.buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws);

  // Fetch lookup maps
  const cats = await db.select({ id: categoriesTable.id, name: categoriesTable.name }).from(categoriesTable);
  const subcats = await db.select({ id: subcategoriesTable.id, name: subcategoriesTable.name }).from(subcategoriesTable);
  const branches = await db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable);
  const brands = await db.select({ id: brandsTable.id, name: brandsTable.name }).from(brandsTable);
  const series = await db.select({ id: publisherSeriesTable.id, name: publisherSeriesTable.name }).from(publisherSeriesTable);
  const classes = await db.select({ id: bookClassesTable.id, name: bookClassesTable.name }).from(bookClassesTable);
  const subjects = await db.select({ id: bookSubjectsTable.id, name: bookSubjectsTable.name }).from(bookSubjectsTable);

  const subcatRows = await db.select({ id: subcategoriesTable.id, name: subcategoriesTable.name, categoryId: subcategoriesTable.categoryId }).from(subcategoriesTable);

  const catMap = new Map(cats.map(c => [c.name.toLowerCase(), c.id]));
  const subcatMap = new Map(subcats.map(s => [s.name.toLowerCase(), s.id]));
  // Disambiguate sub-categories by (categoryId, name) since names can repeat across categories
  const subcatByCatMap = new Map(subcatRows.map(s => [`${s.categoryId}::${s.name.toLowerCase()}`, s.id]));
  const branchMap = new Map(branches.map(b => [b.name.toLowerCase(), b.id]));
  const brandMap = new Map(brands.map(b => [b.name.toLowerCase(), b.id]));
  const seriesMap = new Map(series.map(s => [s.name.toLowerCase(), s.id]));
  const classMap = new Map(classes.map(c => [c.name.toLowerCase(), c.id]));
  const subjectMap = new Map(subjects.map(s => [s.name.toLowerCase(), s.id]));

  const importBusinessType = await getPrimaryBusinessType();

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row number

    const sku = String(row["SKU"] ?? "").trim();
    const name = String(row["Name"] ?? "").trim();

    if (!sku || !name) {
      errors.push(`Row ${rowNum}: SKU and Name are required`);
      skipped++;
      continue;
    }

    const costPrice = parseFloat(String(row["Cost Price"] ?? "0")) || 0;
    const salePrice = parseFloat(String(row["Sale Price"] ?? "0")) || 0;

    const categoryName = String(row["Category"] ?? "").trim().toLowerCase();
    const subCategoryName = String(row["Sub Category"] ?? row["SubCategory"] ?? "").trim().toLowerCase();
    const branchName = String(row["Branch"] ?? "").trim().toLowerCase();
    const callNumber = String(row["Call Number"] ?? row["CallNumber"] ?? "").trim();
    const brandName = String(row["Publisher"] ?? row["Brand"] ?? "").trim().toLowerCase();
    const seriesName = String(row["Series"] ?? "").trim().toLowerCase();
    const className = String(row["Class"] ?? "").trim().toLowerCase();
    const subjectName = String(row["Subject"] ?? "").trim().toLowerCase();

    const resolvedCategoryId = categoryName ? (catMap.get(categoryName) ?? null) : null;
    const resolvedSubCategoryId = subCategoryName
      ? (resolvedCategoryId != null
          ? (subcatByCatMap.get(`${resolvedCategoryId}::${subCategoryName}`) ?? subcatMap.get(subCategoryName) ?? null)
          : (subcatMap.get(subCategoryName) ?? null))
      : null;

    const values: any = {
      name,
      sku,
      businessType: importBusinessType,
      barcode: String(row["Barcode"] ?? "").trim() || null,
      isbn: String(row["ISBN"] ?? "").trim() || null,
      author: String(row["Author"] ?? "").trim() || null,
      edition: String(row["Edition"] ?? "").trim() || null,
      costPrice: String(costPrice),
      salePrice: String(salePrice),
      discountPrice: row["Discount Price"] ? String(parseFloat(String(row["Discount Price"]))) : null,
      stock: parseInt(String(row["Stock"] ?? "0")) || 0,
      lowStockLimit: parseInt(String(row["Low Stock Limit"] ?? "0")) || 0,
      unit: String(row["Unit"] ?? "PCS").trim() || "PCS",
      status: ["active", "inactive"].includes(String(row["Status"] ?? "").toLowerCase()) ? String(row["Status"]).toLowerCase() : "active",
      batchNumber: String(row["Batch Number"] ?? "").trim() || null,
      mfgDate: String(row["Mfg Date"] ?? "").trim() || null,
      expiryDate: String(row["Expiry Date"] ?? "").trim() || null,
      description: String(row["Description"] ?? "").trim() || null,
      categoryId: resolvedCategoryId,
      subCategoryId: resolvedSubCategoryId,
      branchId: branchName ? (branchMap.get(branchName) ?? null) : null,
      callNumber: callNumber || null,
      brandId: brandName ? (brandMap.get(brandName) ?? null) : null,
      seriesId: seriesName ? (seriesMap.get(seriesName) ?? null) : null,
      classId: className ? (classMap.get(className) ?? null) : null,
      subjectId: subjectName ? (subjectMap.get(subjectName) ?? null) : null,
    };

    try {
      await db.insert(productsTable).values(values)
        .onDuplicateKeyUpdate({ set: {
          name: values.name,
          costPrice: values.costPrice,
          salePrice: values.salePrice,
          status: values.status,
          categoryId: values.categoryId,
          subCategoryId: values.subCategoryId,
          branchId: values.branchId,
          callNumber: values.callNumber,
          brandId: values.brandId,
          seriesId: values.seriesId,
          classId: values.classId,
          subjectId: values.subjectId,
          unit: values.unit,
          lowStockLimit: values.lowStockLimit,
          discountPrice: values.discountPrice,
          barcode: values.barcode,
          isbn: values.isbn,
          author: values.author,
          edition: values.edition,
          description: values.description,
          batchNumber: values.batchNumber,
          mfgDate: values.mfgDate,
          expiryDate: values.expiryDate,
        } });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${rowNum}: ${err.message}`);
      skipped++;
    }
  }

  res.json({ imported, skipped, errors });
});

router.get("/products/low-stock", requireAuth, async (req, res): Promise<void> => {
  const products = await db.select(productSelect).from(productsTable)
    .where(lte(productsTable.stock, productsTable.lowStockLimit))
    .orderBy(productsTable.stock);
  res.json(products.map(mapProduct));
});

router.get("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [product] = await db.select(productSelect).from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(mapProduct(product));
});

router.post("/products", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.barcode) {
    const [existing] = await db.select({ id: productsTable.id }).from(productsTable)
      .where(eq(productsTable.barcode, parsed.data.barcode));
    if (existing) { res.status(409).json({ error: "Barcode already in use" }); return; }
  }

  const d = parsed.data;
  const businessType = await getPrimaryBusinessType();
  const [{ id: newId }] = await db.insert(productsTable).values({
    name: d.name,
    sku: d.sku,
    businessType,
    barcode: d.barcode ?? null,
    isbn: d.isbn ?? null,
    categoryId: d.categoryId ?? null,
    subCategoryId: d.subCategoryId ?? null,
    branchId: d.branchId ?? null,
    callNumber: d.callNumber ?? null,
    brandId: d.brandId ?? null,
    seriesId: d.seriesId ?? null,
    classId: d.classId ?? null,
    subjectId: d.subjectId ?? null,
    author: d.author ?? null,
    edition: d.edition ?? null,
    costPrice: String(d.costPrice),
    salePrice: String(d.salePrice),
    discountPrice: d.discountPrice != null ? String(d.discountPrice) : null,
    stock: d.stock ?? 0,
    lowStockLimit: d.lowStockLimit ?? 0,
    description: d.description ?? null,
    imageUrl: d.imageUrl ?? null,
    status: d.status ?? "active",
    unit: d.unit ?? "PCS",
    batchNumber: d.batchNumber ?? null,
    mfgDate: d.mfgDate ?? null,
    expiryDate: d.expiryDate ?? null,
  }).$returningId();
  const [product] = await db.select(productSelect).from(productsTable).where(eq(productsTable.id, newId));
  res.status(201).json({ ...mapProduct(product), categoryName: null, subCategoryName: null, branchName: null, brandName: null, seriesName: null, className: null, subjectName: null });
});

router.patch("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.barcode) {
    const [existing] = await db.select({ id: productsTable.id }).from(productsTable)
      .where(and(eq(productsTable.barcode, parsed.data.barcode), sql`id != ${params.data.id}`));
    if (existing) { res.status(409).json({ error: "Barcode already in use by another product" }); return; }
  }

  const [current] = await db.select({ imageUrl: productsTable.imageUrl }).from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!current) { res.status(404).json({ error: "Product not found" }); return; }

  const updateData: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.name !== undefined) updateData.name = d.name;
  if (d.barcode !== undefined) updateData.barcode = d.barcode;
  if (d.isbn !== undefined) updateData.isbn = d.isbn;
  if (d.categoryId !== undefined) updateData.categoryId = d.categoryId;
  if (d.subCategoryId !== undefined) updateData.subCategoryId = d.subCategoryId;
  if (d.branchId !== undefined) updateData.branchId = d.branchId;
  if (d.callNumber !== undefined) updateData.callNumber = d.callNumber;
  if (d.brandId !== undefined) updateData.brandId = d.brandId;
  if (d.seriesId !== undefined) updateData.seriesId = d.seriesId;
  if (d.classId !== undefined) updateData.classId = d.classId;
  if (d.subjectId !== undefined) updateData.subjectId = d.subjectId;
  if (d.author !== undefined) updateData.author = d.author;
  if (d.edition !== undefined) updateData.edition = d.edition;
  if (d.costPrice !== undefined) updateData.costPrice = String(d.costPrice);
  if (d.salePrice !== undefined) updateData.salePrice = String(d.salePrice);
  if (d.discountPrice !== undefined) updateData.discountPrice = String(d.discountPrice);
  if (d.stock !== undefined) updateData.stock = d.stock;
  if (d.lowStockLimit !== undefined) updateData.lowStockLimit = d.lowStockLimit;
  if (d.description !== undefined) updateData.description = d.description;
  if (d.imageUrl !== undefined) updateData.imageUrl = d.imageUrl || null;
  if (d.status !== undefined) updateData.status = d.status;
  if (d.unit !== undefined) updateData.unit = d.unit;
  if (d.batchNumber !== undefined) updateData.batchNumber = d.batchNumber;
  if (d.mfgDate !== undefined) updateData.mfgDate = d.mfgDate;
  if (d.expiryDate !== undefined) updateData.expiryDate = d.expiryDate;

  await db.update(productsTable).set(updateData).where(eq(productsTable.id, params.data.id));
  const [product] = await db.select(productSelect).from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  if (d.imageUrl !== undefined && current.imageUrl && current.imageUrl !== d.imageUrl) {
    objectStorageService.deleteObjectByStoredUrl(current.imageUrl).catch((err) => {
      req.log.warn({ err }, "Failed to delete old product image from storage");
    });
  }

  res.json({ ...mapProduct(product), categoryName: null, subCategoryName: null, branchName: null, brandName: null, seriesName: null, className: null, subjectName: null });
});

router.delete("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [current] = await db.select({ imageUrl: productsTable.imageUrl }).from(productsTable).where(eq(productsTable.id, params.data.id));
  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));

  if (current?.imageUrl) {
    objectStorageService.deleteObjectByStoredUrl(current.imageUrl).catch((err) => {
      req.log.warn({ err }, "Failed to delete product image from storage on product delete");
    });
  }

  res.sendStatus(204);
});

export default router;
