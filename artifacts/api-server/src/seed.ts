import { db, usersTable, branchesTable, categoriesTable, subcategoriesTable, brandsTable, productsTable, customersTable, suppliersTable, settingsTable, bookClassesTable, bookSubjectsTable, publisherSeriesTable } from "@workspace/db";
import { hashPassword } from "./lib/auth.js";
import { logger } from "./lib/logger.js";
import { eq, isNull, and } from "drizzle-orm";

export async function seed() {
  // Check if already seeded
  const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.username, "admin"));
  if (existingAdmin) {
    logger.info("Database already seeded, skipping.");
    await seedBookCatalog();
    await seedStationeryCatalog();
    await patchProductImages();
    return;
  }

  logger.info("Seeding database...");

  // Settings
  await db.insert(settingsTable).values({
    storeName: "Tech Mentor ERP & POS",
    storePhone: "+92-300-0000000",
    storeEmail: "admin@smartretail.com",
    storeAddress: "123 Main Street, Karachi, Pakistan",
    currency: "PKR",
    taxRate: "0",
    invoicePrefix: "INV",
  }).onConflictDoNothing();

  // Main branch
  const [mainBranch] = await db.insert(branchesTable).values({
    name: "Main Branch",
    address: "123 Main Street, Karachi",
    phone: "+92-300-0000000",
    email: "main@smartretail.com",
    isMain: true,
  }).returning();

  // Admin user
  const adminHash = await hashPassword("admin123");
  await db.insert(usersTable).values({
    username: "admin",
    passwordHash: adminHash,
    name: "System Administrator",
    email: "admin@smartretail.com",
    role: "admin",
    status: "active",
    branchId: mainBranch.id,
  });

  // Manager user
  const managerHash = await hashPassword("manager123");
  await db.insert(usersTable).values({
    username: "manager",
    passwordHash: managerHash,
    name: "Store Manager",
    email: "manager@smartretail.com",
    role: "manager",
    status: "active",
    branchId: mainBranch.id,
  });

  // Categories
  const categories = await db.insert(categoriesTable).values([
    { name: "Electronics", description: "Electronic devices and accessories" },
    { name: "Clothing", description: "Apparel and fashion items" },
    { name: "Food & Beverages", description: "Consumable food products" },
    { name: "Home & Garden", description: "Household and garden items" },
    { name: "Health & Beauty", description: "Personal care products" },
    { name: "Books & Stationery", description: "Textbooks, notebooks and stationery" },
  ]).returning();

  // Brands (includes publishers)
  const brands = await db.insert(brandsTable).values([
    { name: "Samsung", description: "Korean electronics giant" },
    { name: "Apple", description: "American technology company" },
    { name: "Nike", description: "Athletic footwear and apparel" },
    { name: "Nestlé", description: "Swiss food and beverage company" },
    { name: "Generic", description: "Generic / unbranded products" },
    // Book publishers
    { name: "Punjab Textbook Board", description: "Official Punjab government textbook publisher" },
    { name: "Afaq Publishers", description: "Private textbook publisher" },
    { name: "Conti Publishers", description: "Private textbook publisher" },
    { name: "Book Wise", description: "Private textbook and guide publisher" },
    { name: "Oxford University Press", description: "OUP Pakistan textbooks" },
    { name: "Cambridge University Press", description: "Cambridge Pakistan textbooks" },
    { name: "Paramount Books", description: "Private textbook publisher" },
    { name: "National Book Foundation", description: "National Book Foundation Pakistan" },
    { name: "Federal Board", description: "Federal Board of Intermediate & Secondary Education" },
    { name: "MM Publications", description: "MM Publications Pakistan" },
  ]).returning();

  // Products
  await db.insert(productsTable).values([
    {
      name: "Samsung Galaxy A54 5G",
      sku: "SAM-A54-5G",
      barcode: "8806094921670",
      categoryId: categories[0].id,
      brandId: brands[0].id,
      costPrice: "55000",
      salePrice: "72000",
      stock: 25,
      lowStockLimit: 5,
      description: "Mid-range Android smartphone with 6.4\" Super AMOLED display, 50MP camera, and 5000mAh battery.",
      imageUrl: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=600&fit=crop",
      status: "active",
    },
    {
      name: "iPhone 14 128GB",
      sku: "APL-IP14-128",
      barcode: "194253374459",
      categoryId: categories[0].id,
      brandId: brands[1].id,
      costPrice: "130000",
      salePrice: "175000",
      stock: 10,
      lowStockLimit: 3,
      description: "Apple iPhone 14 with A15 Bionic chip, 12MP dual-camera system, and all-day battery life.",
      imageUrl: "https://images.unsplash.com/photo-1657722703838-cb32b01be53e?w=600&h=600&fit=crop",
      status: "active",
    },
    {
      name: "Nike Air Max 270",
      sku: "NKE-AM270-BLK",
      barcode: "888409843652",
      categoryId: categories[1].id,
      brandId: brands[2].id,
      costPrice: "12000",
      salePrice: "18500",
      stock: 30,
      lowStockLimit: 5,
      description: "Nike Air Max 270 running shoes with the largest heel Air unit yet for all-day comfort.",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
      status: "active",
    },
    {
      name: "Nestlé Milo 500g",
      sku: "NES-MILO-500",
      barcode: "8901058857136",
      categoryId: categories[2].id,
      brandId: brands[3].id,
      costPrice: "450",
      salePrice: "600",
      stock: 5,
      lowStockLimit: 20,
      description: "Nestlé Milo chocolate malt energy drink powder, 500g tin. Rich in vitamins and minerals.",
      imageUrl: "https://images.unsplash.com/photo-1571506165871-ee72a35bc9d4?w=600&h=600&fit=crop",
      status: "active",
    },
    {
      name: "USB-C Charging Cable 1m",
      sku: "GEN-USBC-1M",
      barcode: "9999999000001",
      categoryId: categories[0].id,
      brandId: brands[4].id,
      costPrice: "150",
      salePrice: "350",
      stock: 100,
      lowStockLimit: 20,
      description: "Universal USB-C charging cable, 1 meter. Compatible with all USB-C devices. Braided nylon for durability.",
      imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&h=600&fit=crop",
      status: "active",
    },
    {
      name: "T-Shirt (White, L)",
      sku: "CLO-TS-WHT-L",
      barcode: "9999999000002",
      categoryId: categories[1].id,
      brandId: brands[4].id,
      costPrice: "400",
      salePrice: "850",
      stock: 0,
      lowStockLimit: 10,
      description: "Premium 100% cotton white t-shirt. Comfortable fit for everyday wear. Size: Large.",
      imageUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop",
      status: "active",
    },
  ]);

  // Suppliers
  await db.insert(suppliersTable).values([
    {
      name: "Tech Distributors Ltd",
      company: "Tech Distributors Ltd",
      phone: "+92-21-3456789",
      email: "info@techdist.pk",
      address: "Industrial Area, SITE, Karachi",
    },
    {
      name: "Fashion Wholesale Hub",
      company: "Fashion Wholesale Hub",
      phone: "+92-21-5551234",
      email: "orders@fashionhub.pk",
      address: "Cloth Market, Jodia Bazar, Karachi",
    },
    {
      name: "Global Imports Co",
      company: "Global Imports Co",
      phone: "+92-300-7777777",
      email: "global@imports.pk",
      address: "Export Processing Zone, Karachi",
    },
  ]);

  // Customers
  await db.insert(customersTable).values([
    {
      name: "Ahmed Khan",
      phone: "+92-321-1234567",
      email: "ahmed.khan@gmail.com",
      address: "45 Garden Road, Karachi",
      creditLimit: "50000",
    },
    {
      name: "Sara Ahmed",
      phone: "+92-332-9876543",
      email: "sara.ahmed@hotmail.com",
      address: "12 Defence Phase 6, Karachi",
      creditLimit: "100000",
    },
    {
      name: "Muhammad Ali",
      phone: "+92-300-5555555",
      address: "78 Gulshan-e-Iqbal Block 7, Karachi",
      creditLimit: "25000",
    },
  ]);

  logger.info("Database seeded successfully!");
  logger.info("Login credentials: admin / admin123");

  await seedBookCatalog();
  await seedStationeryCatalog();
  await patchProductImages();
}

async function seedBookCatalog() {
  // Check if book classes are already seeded
  const existing = await db.select({ id: bookClassesTable.id }).from(bookClassesTable).limit(1);
  if (existing.length > 0) {
    logger.info("Book catalog already seeded, skipping.");
    return;
  }

  logger.info("Seeding book catalog...");

  // Book Classes (Nursery → Class 12)
  const classData = [
    { name: "Nursery", sortOrder: 1 },
    { name: "KG", sortOrder: 2 },
    { name: "Class 1", sortOrder: 3 },
    { name: "Class 2", sortOrder: 4 },
    { name: "Class 3", sortOrder: 5 },
    { name: "Class 4", sortOrder: 6 },
    { name: "Class 5", sortOrder: 7 },
    { name: "Class 6", sortOrder: 8 },
    { name: "Class 7", sortOrder: 9 },
    { name: "Class 8", sortOrder: 10 },
    { name: "Class 9", sortOrder: 11 },
    { name: "Class 10", sortOrder: 12 },
    { name: "Class 11", sortOrder: 13 },
    { name: "Class 12", sortOrder: 14 },
  ];
  await db.insert(bookClassesTable).values(classData).onConflictDoNothing();

  // Book Subjects
  const subjects = [
    "English", "Urdu", "Mathematics", "General Science",
    "Social Studies", "Islamiyat", "Computer Science",
    "Physics", "Chemistry", "Biology",
    "Pakistan Studies", "Civics", "History", "Geography",
    "Drawing & Arts", "Home Economics",
  ];
  await db.insert(bookSubjectsTable).values(subjects.map(name => ({ name }))).onConflictDoNothing();

  // Look up publisher brands
  const publisherNames = [
    "Punjab Textbook Board",
    "Afaq Publishers",
    "Conti Publishers",
    "Book Wise",
    "Oxford University Press",
    "Cambridge University Press",
    "Paramount Books",
    "National Book Foundation",
    "Federal Board",
    "MM Publications",
  ];

  const publisherBrands = await db.select({ id: brandsTable.id, name: brandsTable.name })
    .from(brandsTable)
    .where(eq(brandsTable.name, "Punjab Textbook Board"));

  // Create missing publishers if not already in brands
  for (const pName of publisherNames) {
    const [existing] = await db.select({ id: brandsTable.id }).from(brandsTable).where(eq(brandsTable.name, pName));
    if (!existing) {
      await db.insert(brandsTable).values({ name: pName, description: "Book publisher" }).onConflictDoNothing();
    }
  }

  // Now fetch all publisher brands
  const allBrands = await db.select({ id: brandsTable.id, name: brandsTable.name }).from(brandsTable);
  const brandByName = new Map(allBrands.map(b => [b.name, b.id]));

  // Publisher Series
  const seriesData: { brandId: number; name: string }[] = [];

  const ptbId = brandByName.get("Punjab Textbook Board");
  if (ptbId) {
    seriesData.push(
      { brandId: ptbId, name: "PTB Primary Series (1-5)" },
      { brandId: ptbId, name: "PTB Middle Series (6-8)" },
      { brandId: ptbId, name: "PTB Matric Series (9-10)" },
      { brandId: ptbId, name: "PTB Intermediate Series (11-12)" },
    );
  }

  const afaqId = brandByName.get("Afaq Publishers");
  if (afaqId) {
    seriesData.push(
      { brandId: afaqId, name: "Afaq Keynotes (Primary)" },
      { brandId: afaqId, name: "Afaq Guide (Matric)" },
      { brandId: afaqId, name: "Afaq Solved Papers (Inter)" },
    );
  }

  const contiId = brandByName.get("Conti Publishers");
  if (contiId) {
    seriesData.push(
      { brandId: contiId, name: "Conti English Grammar Series" },
      { brandId: contiId, name: "Conti Matric Solved Series" },
    );
  }

  const bookWiseId = brandByName.get("Book Wise");
  if (bookWiseId) {
    seriesData.push(
      { brandId: bookWiseId, name: "Book Wise Guides (Primary)" },
      { brandId: bookWiseId, name: "Book Wise Matric Notes" },
    );
  }

  const oupId = brandByName.get("Oxford University Press");
  if (oupId) {
    seriesData.push(
      { brandId: oupId, name: "OUP New Countdown Mathematics" },
      { brandId: oupId, name: "OUP Stepping Stones (Primary)" },
    );
  }

  const cambId = brandByName.get("Cambridge University Press");
  if (cambId) {
    seriesData.push(
      { brandId: cambId, name: "Cambridge O Level Series" },
      { brandId: cambId, name: "Cambridge A Level Series" },
    );
  }

  const paramountId = brandByName.get("Paramount Books");
  if (paramountId) {
    seriesData.push(
      { brandId: paramountId, name: "Paramount Solved Papers" },
      { brandId: paramountId, name: "Paramount Notes (Matric)" },
    );
  }

  const federalId = brandByName.get("Federal Board");
  if (federalId) {
    seriesData.push(
      { brandId: federalId, name: "FBISE Textbooks (9-10)" },
      { brandId: federalId, name: "FBISE Textbooks (11-12)" },
    );
  }

  const mmId = brandByName.get("MM Publications");
  if (mmId) {
    seriesData.push(
      { brandId: mmId, name: "MM Key Notes Series" },
    );
  }

  if (seriesData.length > 0) {
    await db.insert(publisherSeriesTable).values(seriesData).onConflictDoNothing();
  }

  logger.info(`Book catalog seeded: ${classData.length} classes, ${subjects.length} subjects, ${seriesData.length} series.`);
}

async function seedStationeryCatalog() {
  // Idempotency: skip if subcategories already exist
  const existingSub = await db.select({ id: subcategoriesTable.id }).from(subcategoriesTable).limit(1);
  if (existingSub.length > 0) {
    logger.info("Stationery catalog already seeded, skipping.");
    return;
  }

  logger.info("Seeding stationery catalog...");

  // Top-level "Stationery" category (reuse if exists)
  let [stationeryCat] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.name, "Stationery"));
  if (!stationeryCat) {
    [stationeryCat] = await db.insert(categoriesTable).values({ name: "Stationery", description: "School & office stationery items" }).returning({ id: categoriesTable.id });
  }
  const stationeryId = stationeryCat.id;

  // Sub-categories under Stationery
  const subcatNames = [
    "Copies",
    "Registers",
    "Student Diaries",
    "Chart Papers",
    "Pens",
    "Markers",
    "Pencils",
    "Colors & Art Items",
    "Geometry Items",
    "School Accessories",
  ];
  const insertedSubs = await db.insert(subcategoriesTable)
    .values(subcatNames.map(name => ({ name, categoryId: stationeryId })))
    .returning({ id: subcategoriesTable.id, name: subcategoriesTable.name });
  const subId = new Map(insertedSubs.map(s => [s.name, s.id]));

  // Product templates: [name, subcategoryName, salePrice, callNumber?]
  const templates: { name: string; sub: string; price: number; unit?: string; call?: string }[] = [
    // Copies (call number = pages)
    { name: "Single Line Copy", sub: "Copies", price: 60, unit: "PCS", call: "100" },
    { name: "Double Line Copy", sub: "Copies", price: 60, unit: "PCS", call: "100" },
    { name: "Four Line Copy", sub: "Copies", price: 70, unit: "PCS", call: "100" },
    { name: "Square Copy", sub: "Copies", price: 70, unit: "PCS", call: "100" },
    { name: "Practical Copy", sub: "Copies", price: 90, unit: "PCS", call: "120" },
    // Registers (call number = pages)
    { name: "Student Register", sub: "Registers", price: 250, unit: "PCS", call: "200" },
    { name: "Attendance Register", sub: "Registers", price: 300, unit: "PCS", call: "300" },
    { name: "Office Register", sub: "Registers", price: 350, unit: "PCS", call: "400" },
    { name: "Cash Register", sub: "Registers", price: 350, unit: "PCS", call: "400" },
    { name: "Stock Register", sub: "Registers", price: 400, unit: "PCS", call: "500" },
    // Student Diaries
    { name: "Student Diary 50 Pages", sub: "Student Diaries", price: 80, unit: "PCS" },
    { name: "Student Diary 70 Pages", sub: "Student Diaries", price: 100, unit: "PCS" },
    { name: "Student Diary 100 Pages", sub: "Student Diaries", price: 130, unit: "PCS" },
    // Chart Papers
    { name: "White Chart", sub: "Chart Papers", price: 30, unit: "SHEET" },
    { name: "Black Chart", sub: "Chart Papers", price: 35, unit: "SHEET" },
    { name: "Green Chart", sub: "Chart Papers", price: 35, unit: "SHEET" },
    { name: "Blue Chart", sub: "Chart Papers", price: 35, unit: "SHEET" },
    { name: "Yellow Chart", sub: "Chart Papers", price: 35, unit: "SHEET" },
    { name: "Pink Chart", sub: "Chart Papers", price: 35, unit: "SHEET" },
    { name: "Red Chart", sub: "Chart Papers", price: 35, unit: "SHEET" },
    { name: "Golden Chart", sub: "Chart Papers", price: 50, unit: "SHEET" },
    { name: "Silver Chart", sub: "Chart Papers", price: 50, unit: "SHEET" },
    { name: "Glitter Chart", sub: "Chart Papers", price: 60, unit: "SHEET" },
    { name: "Fluorescent Chart", sub: "Chart Papers", price: 50, unit: "SHEET" },
    { name: "Card Sheet", sub: "Chart Papers", price: 40, unit: "SHEET" },
    { name: "Handmade Sheet", sub: "Chart Papers", price: 70, unit: "SHEET" },
    // Pens
    { name: "Ball Pen", sub: "Pens", price: 20, unit: "PCS" },
    { name: "Gel Pen", sub: "Pens", price: 40, unit: "PCS" },
    { name: "Ink Pen", sub: "Pens", price: 120, unit: "PCS" },
    { name: "Lead Pen", sub: "Pens", price: 50, unit: "PCS" },
    { name: "Pointer", sub: "Pens", price: 60, unit: "PCS" },
    // Markers
    { name: "Board Marker", sub: "Markers", price: 60, unit: "PCS" },
    { name: "White Board Marker", sub: "Markers", price: 60, unit: "PCS" },
    { name: "Permanent Marker", sub: "Markers", price: 70, unit: "PCS" },
    { name: "CD Marker", sub: "Markers", price: 80, unit: "PCS" },
    // Pencils
    { name: "HB Pencil", sub: "Pencils", price: 15, unit: "PCS" },
    { name: "2B Pencil", sub: "Pencils", price: 20, unit: "PCS" },
    { name: "Drawing Pencil", sub: "Pencils", price: 30, unit: "PCS" },
    { name: "Exam Pencil", sub: "Pencils", price: 20, unit: "PCS" },
    { name: "Mechanical Pencil", sub: "Pencils", price: 80, unit: "PCS" },
    // Colors & Art Items
    { name: "Pencil Colors", sub: "Colors & Art Items", price: 150, unit: "BOX" },
    { name: "Crayons", sub: "Colors & Art Items", price: 120, unit: "BOX" },
    { name: "Oil Pastels", sub: "Colors & Art Items", price: 180, unit: "BOX" },
    { name: "Water Colors", sub: "Colors & Art Items", price: 200, unit: "BOX" },
    { name: "Poster Colors", sub: "Colors & Art Items", price: 250, unit: "BOX" },
    { name: "Acrylic Colors", sub: "Colors & Art Items", price: 350, unit: "BOX" },
    { name: "Paint Brushes", sub: "Colors & Art Items", price: 100, unit: "SET" },
    // Geometry Items
    { name: "Geometry Box", sub: "Geometry Items", price: 200, unit: "PCS" },
    { name: "Compass", sub: "Geometry Items", price: 80, unit: "PCS" },
    { name: "Divider", sub: "Geometry Items", price: 70, unit: "PCS" },
    { name: "Protractor", sub: "Geometry Items", price: 30, unit: "PCS" },
    { name: "Set Square", sub: "Geometry Items", price: 40, unit: "PCS" },
    { name: "Scale", sub: "Geometry Items", price: 25, unit: "PCS" },
    // School Accessories
    { name: "School Bag", sub: "School Accessories", price: 1200, unit: "PCS" },
    { name: "Pencil Box", sub: "School Accessories", price: 150, unit: "PCS" },
    { name: "Water Bottle", sub: "School Accessories", price: 300, unit: "PCS" },
    { name: "Lunch Box", sub: "School Accessories", price: 400, unit: "PCS" },
    { name: "Book Cover", sub: "School Accessories", price: 20, unit: "PCS" },
  ];

  const skuPrefix = "STN";
  const values = templates.map((t, i) => {
    const seq = String(i + 1).padStart(3, "0");
    const cost = Math.round(t.price * 0.7);
    return {
      name: t.name,
      sku: `${skuPrefix}-${seq}`,
      categoryId: stationeryId,
      subCategoryId: subId.get(t.sub) ?? null,
      callNumber: t.call ?? null,
      costPrice: String(cost),
      salePrice: String(t.price),
      stock: 50,
      lowStockLimit: 10,
      unit: t.unit ?? "PCS",
      status: "active",
    };
  });

  await db.insert(productsTable).values(values).onConflictDoNothing();

  logger.info(`Stationery catalog seeded: ${subcatNames.length} sub-categories, ${templates.length} product templates.`);
}

async function patchProductImages() {
  // --- Per-product image patches (named products) ---
  const imageMap: Record<string, { imageUrl: string; description?: string }> = {
    "Samsung Galaxy A54 5G": {
      imageUrl: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=600&fit=crop",
      description: "Mid-range Android smartphone with 6.4\" Super AMOLED display, 50MP camera, and 5000mAh battery.",
    },
    "iPhone 14 128GB": {
      imageUrl: "https://images.unsplash.com/photo-1657722703838-cb32b01be53e?w=600&h=600&fit=crop",
      description: "Apple iPhone 14 with A15 Bionic chip, 12MP dual-camera system, and all-day battery life.",
    },
    "Nike Air Max 270": {
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
      description: "Nike Air Max 270 running shoes with the largest heel Air unit yet for all-day comfort.",
    },
    "Nestlé Milo 500g": {
      imageUrl: "https://images.unsplash.com/photo-1571506165871-ee72a35bc9d4?w=600&h=600&fit=crop",
      description: "Nestlé Milo chocolate malt energy drink powder, 500g tin. Rich in vitamins and minerals.",
    },
    "USB-C Charging Cable 1m": {
      imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&h=600&fit=crop",
      description: "Universal USB-C charging cable, 1 meter. Compatible with all USB-C devices. Braided nylon for durability.",
    },
    "T-Shirt (White, L)": {
      imageUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop",
      description: "Premium 100% cotton white t-shirt. Comfortable fit for everyday wear. Size: Large.",
    },
  };

  let patched = 0;
  for (const [name, data] of Object.entries(imageMap)) {
    const [product] = await db
      .select({ id: productsTable.id, imageUrl: productsTable.imageUrl })
      .from(productsTable)
      .where(eq(productsTable.name, name))
      .limit(1);

    if (product && !product.imageUrl) {
      await db
        .update(productsTable)
        .set(data)
        .where(and(eq(productsTable.id, product.id), isNull(productsTable.imageUrl)));
      patched++;
    }
  }

  // --- Category-level fallback images ---
  // Any product without an imageUrl gets a curated category placeholder so the
  // store never shows the broken ImageOff icon for seeded or newly-added items.
  const categoryImageMap: Record<string, string> = {
    "Books & Stationery": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=600&fit=crop",
    "Electronics":        "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=600&fit=crop",
    "Clothing":           "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&h=600&fit=crop",
    "Food & Beverages":   "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=600&fit=crop",
    "Home & Garden":      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop",
    "Health & Beauty":    "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=600&h=600&fit=crop",
  };

  for (const [categoryName, imageUrl] of Object.entries(categoryImageMap)) {
    const [category] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.name, categoryName))
      .limit(1);

    if (!category) continue;

    const updated = await db
      .update(productsTable)
      .set({ imageUrl })
      .where(and(eq(productsTable.categoryId, category.id), isNull(productsTable.imageUrl)))
      .returning({ id: productsTable.id });

    patched += updated.length;
  }

  if (patched > 0) {
    logger.info(`Patched images for ${patched} products.`);
  }
}
