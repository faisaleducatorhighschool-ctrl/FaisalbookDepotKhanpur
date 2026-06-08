// Master Data Library: definitions for each supported Business Pack. Applying a
// pack idempotently seeds its categories, brands, units and sample products. The
// catalog also drives the Smart Dashboard (which widgets a business shows) and is
// exposed to the client via /business/config.

import { and, inArray, isNull } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";

export type PackProduct = {
  name: string;
  sku: string;
  salePrice: number;
  costPrice?: number;
  unit?: string;
  categoryName?: string;
  brandName?: string;
  stock?: number;
  lowStockLimit?: number;
};

export type BusinessPackDef = {
  key: string;
  label: string;
  description: string;
  icon: string; // lucide-react icon name, resolved on the client
  accentColor: string; // hex used for the pack card accent
  categories: { name: string; description?: string }[];
  brands: { name: string; description?: string }[];
  units: string[];
  // Optional dashboard widgets this business emphasises. "expiry" toggles the
  // perishables/expiry alert section on the dashboard.
  dashboardWidgets: string[];
  sampleProducts: PackProduct[];
};

const COMMON_UNITS = ["PCS", "BOX", "PACK", "DOZEN"];

export const BUSINESS_PACKS: BusinessPackDef[] = [
  {
    key: "book_store",
    label: "Book Store",
    description: "Textbooks, publishers, series and class-wise catalog for a book shop.",
    icon: "BookOpen",
    accentColor: "#2563eb",
    categories: [
      { name: "Textbooks", description: "School and college textbooks" },
      { name: "Guides & Notes", description: "Keynotes, guides and solved papers" },
      { name: "Novels & Literature", description: "Fiction and general reading" },
      { name: "Children's Books", description: "Story and activity books" },
      { name: "Islamic Books", description: "Religious and Islamic studies" },
    ],
    brands: [
      { name: "Punjab Textbook Board", description: "Official Punjab textbooks" },
      { name: "Oxford University Press", description: "OUP Pakistan" },
      { name: "Cambridge University Press", description: "Cambridge Pakistan" },
      { name: "Afaq Publishers" },
      { name: "Paramount Books" },
      { name: "Book Wise" },
      { name: "Rehman Publishers" },
    ],
    units: ["PCS", "SET", "DOZEN"],
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock"],
    sampleProducts: [
      { name: "English Grammar (Class 5)", sku: "BKS-001", salePrice: 350, categoryName: "Textbooks", brandName: "Oxford University Press", stock: 40, lowStockLimit: 8 },
      { name: "Mathematics Keynotes (Class 9)", sku: "BKS-002", salePrice: 280, categoryName: "Guides & Notes", brandName: "Afaq Publishers", stock: 60, lowStockLimit: 10 },
      { name: "Urdu Qaida", sku: "BKS-003", salePrice: 120, categoryName: "Children's Books", brandName: "Punjab Textbook Board", stock: 100, lowStockLimit: 15 },
      { name: "General Knowledge Novel", sku: "BKS-004", salePrice: 500, categoryName: "Novels & Literature", brandName: "Paramount Books", stock: 25, lowStockLimit: 5 },
    ],
  },
  {
    key: "stationery_store",
    label: "Stationery Store",
    description: "Copies, registers, pens, charts, colors and office stationery.",
    icon: "PenTool",
    accentColor: "#7c3aed",
    categories: [
      { name: "Copies & Registers" },
      { name: "Pens & Markers" },
      { name: "Pencils & Erasers" },
      { name: "Charts & Sheets" },
      { name: "Colors & Art" },
      { name: "Geometry & Files" },
    ],
    brands: [
      { name: "Dollar" },
      { name: "Piano" },
      { name: "Deer" },
      { name: "Signature" },
      { name: "Generic" },
    ],
    units: ["PCS", "BOX", "PACK", "DOZEN", "SHEET", "SET"],
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock"],
    sampleProducts: [
      { name: "Single Line Copy (100 pg)", sku: "STP-001", salePrice: 60, categoryName: "Copies & Registers", unit: "PCS", stock: 200, lowStockLimit: 30 },
      { name: "Ball Pen (Blue)", sku: "STP-002", salePrice: 20, categoryName: "Pens & Markers", brandName: "Piano", unit: "PCS", stock: 500, lowStockLimit: 50 },
      { name: "White Chart", sku: "STP-003", salePrice: 30, categoryName: "Charts & Sheets", unit: "SHEET", stock: 300, lowStockLimit: 40 },
      { name: "Pencil Colors (12)", sku: "STP-004", salePrice: 150, categoryName: "Colors & Art", brandName: "Deer", unit: "BOX", stock: 80, lowStockLimit: 15 },
      { name: "Geometry Box", sku: "STP-005", salePrice: 200, categoryName: "Geometry & Files", unit: "PCS", stock: 60, lowStockLimit: 10 },
    ],
  },
  {
    key: "school_store",
    label: "School Store",
    description: "Uniforms, books, stationery and school accessories in one place.",
    icon: "GraduationCap",
    accentColor: "#0891b2",
    categories: [
      { name: "Uniforms" },
      { name: "Books" },
      { name: "Stationery" },
      { name: "School Bags" },
      { name: "Accessories" },
    ],
    brands: [{ name: "Generic" }, { name: "Bata" }, { name: "Service" }],
    units: ["PCS", "SET", "PAIR"],
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock"],
    sampleProducts: [
      { name: "School Shirt (White)", sku: "SCH-001", salePrice: 700, categoryName: "Uniforms", unit: "PCS", stock: 120, lowStockLimit: 20 },
      { name: "School Bag", sku: "SCH-002", salePrice: 1200, categoryName: "School Bags", unit: "PCS", stock: 50, lowStockLimit: 10 },
      { name: "Water Bottle", sku: "SCH-003", salePrice: 300, categoryName: "Accessories", unit: "PCS", stock: 90, lowStockLimit: 15 },
    ],
  },
  {
    key: "grocery_store",
    label: "Grocery Store",
    description: "Daily groceries, beverages and household essentials.",
    icon: "ShoppingBasket",
    accentColor: "#16a34a",
    categories: [
      { name: "Rice & Grains" },
      { name: "Cooking Oil & Ghee" },
      { name: "Beverages" },
      { name: "Snacks & Confectionery" },
      { name: "Dairy & Eggs" },
      { name: "Household & Cleaning" },
    ],
    brands: [
      { name: "Nestlé" },
      { name: "National" },
      { name: "Shan" },
      { name: "Dalda" },
      { name: "Olpers" },
      { name: "Generic" },
    ],
    units: ["KG", "GRAM", "LITRE", "ML", "PCS", "PACK", "DOZEN"],
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock", "expiry"],
    sampleProducts: [
      { name: "Basmati Rice 5kg", sku: "GRO-001", salePrice: 1600, categoryName: "Rice & Grains", brandName: "National", unit: "PACK", stock: 80, lowStockLimit: 12 },
      { name: "Cooking Oil 1L", sku: "GRO-002", salePrice: 550, categoryName: "Cooking Oil & Ghee", brandName: "Dalda", unit: "LITRE", stock: 100, lowStockLimit: 15 },
      { name: "Milk 1L", sku: "GRO-003", salePrice: 220, categoryName: "Dairy & Eggs", brandName: "Olpers", unit: "LITRE", stock: 60, lowStockLimit: 20 },
      { name: "Soft Drink 1.5L", sku: "GRO-004", salePrice: 130, categoryName: "Beverages", unit: "PCS", stock: 150, lowStockLimit: 24 },
    ],
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    description: "Medicines, healthcare and wellness with batch & expiry tracking.",
    icon: "Pill",
    accentColor: "#dc2626",
    categories: [
      { name: "Medicines" },
      { name: "Supplements" },
      { name: "Personal Care" },
      { name: "Baby Care" },
      { name: "Medical Devices" },
    ],
    brands: [
      { name: "GSK" },
      { name: "Abbott" },
      { name: "Getz Pharma" },
      { name: "Searle" },
      { name: "Generic" },
    ],
    units: ["PCS", "BOX", "STRIP", "BOTTLE", "PACK"],
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock", "expiry"],
    sampleProducts: [
      { name: "Paracetamol 500mg (Strip)", sku: "PHR-001", salePrice: 35, categoryName: "Medicines", brandName: "GSK", unit: "STRIP", stock: 300, lowStockLimit: 50 },
      { name: "Multivitamin (30 tabs)", sku: "PHR-002", salePrice: 650, categoryName: "Supplements", brandName: "Abbott", unit: "BOX", stock: 60, lowStockLimit: 10 },
      { name: "Hand Sanitizer 250ml", sku: "PHR-003", salePrice: 250, categoryName: "Personal Care", unit: "BOTTLE", stock: 80, lowStockLimit: 15 },
    ],
  },
  {
    key: "garments",
    label: "Garments",
    description: "Apparel, fashion and clothing with size and color variants.",
    icon: "Shirt",
    accentColor: "#db2777",
    categories: [
      { name: "Men's Wear" },
      { name: "Women's Wear" },
      { name: "Kids' Wear" },
      { name: "Footwear" },
      { name: "Accessories" },
    ],
    brands: [{ name: "Khaadi" }, { name: "Gul Ahmed" }, { name: "Nike" }, { name: "Generic" }],
    units: ["PCS", "PAIR", "SET"],
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock"],
    sampleProducts: [
      { name: "Men's Kurta (M)", sku: "GAR-001", salePrice: 2200, categoryName: "Men's Wear", brandName: "Gul Ahmed", unit: "PCS", stock: 40, lowStockLimit: 8 },
      { name: "Women's Lawn Suit", sku: "GAR-002", salePrice: 3500, categoryName: "Women's Wear", brandName: "Khaadi", unit: "SET", stock: 30, lowStockLimit: 6 },
      { name: "Sports Shoes", sku: "GAR-003", salePrice: 6500, categoryName: "Footwear", brandName: "Nike", unit: "PAIR", stock: 25, lowStockLimit: 5 },
    ],
  },
  {
    key: "electronics",
    label: "Electronics",
    description: "Consumer electronics, appliances and accessories.",
    icon: "Cpu",
    accentColor: "#0d9488",
    categories: [
      { name: "Home Appliances" },
      { name: "Audio & Video" },
      { name: "Computers & Laptops" },
      { name: "Accessories" },
      { name: "Cameras" },
    ],
    brands: [{ name: "Samsung" }, { name: "LG" }, { name: "Sony" }, { name: "Dawlance" }, { name: "Generic" }],
    units: COMMON_UNITS,
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock"],
    sampleProducts: [
      { name: "LED TV 43\"", sku: "ELE-001", salePrice: 65000, categoryName: "Audio & Video", brandName: "Samsung", unit: "PCS", stock: 15, lowStockLimit: 3 },
      { name: "Microwave Oven", sku: "ELE-002", salePrice: 28000, categoryName: "Home Appliances", brandName: "Dawlance", unit: "PCS", stock: 12, lowStockLimit: 3 },
      { name: "Wireless Earbuds", sku: "ELE-003", salePrice: 4500, categoryName: "Accessories", brandName: "Sony", unit: "PCS", stock: 50, lowStockLimit: 10 },
    ],
  },
  {
    key: "mobile_shop",
    label: "Mobile Shop",
    description: "Smartphones, accessories, SIMs and repair services.",
    icon: "Smartphone",
    accentColor: "#4f46e5",
    categories: [
      { name: "Smartphones" },
      { name: "Feature Phones" },
      { name: "Chargers & Cables" },
      { name: "Covers & Protectors" },
      { name: "Audio Accessories" },
    ],
    brands: [{ name: "Samsung" }, { name: "Apple" }, { name: "Xiaomi" }, { name: "Infinix" }, { name: "Generic" }],
    units: ["PCS", "BOX", "PACK"],
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock"],
    sampleProducts: [
      { name: "Smartphone 128GB", sku: "MOB-001", salePrice: 72000, categoryName: "Smartphones", brandName: "Samsung", unit: "PCS", stock: 20, lowStockLimit: 4 },
      { name: "USB-C Cable", sku: "MOB-002", salePrice: 350, categoryName: "Chargers & Cables", unit: "PCS", stock: 200, lowStockLimit: 30 },
      { name: "Tempered Glass", sku: "MOB-003", salePrice: 250, categoryName: "Covers & Protectors", unit: "PCS", stock: 300, lowStockLimit: 40 },
    ],
  },
  {
    key: "office_supplies",
    label: "Office Supplies",
    description: "Office stationery, paper, printers and consumables.",
    icon: "Briefcase",
    accentColor: "#ca8a04",
    categories: [
      { name: "Paper & Printing" },
      { name: "Writing Instruments" },
      { name: "Filing & Storage" },
      { name: "Office Machines" },
      { name: "Desk Accessories" },
    ],
    brands: [{ name: "HP" }, { name: "Canon" }, { name: "Dollar" }, { name: "Generic" }],
    units: ["PCS", "BOX", "PACK", "REAM"],
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock"],
    sampleProducts: [
      { name: "A4 Paper Ream", sku: "OFF-001", salePrice: 1300, categoryName: "Paper & Printing", unit: "REAM", stock: 100, lowStockLimit: 15 },
      { name: "Box File", sku: "OFF-002", salePrice: 180, categoryName: "Filing & Storage", unit: "PCS", stock: 120, lowStockLimit: 20 },
      { name: "Stapler", sku: "OFF-003", salePrice: 350, categoryName: "Desk Accessories", unit: "PCS", stock: 60, lowStockLimit: 10 },
    ],
  },
  {
    key: "general_store",
    label: "General Store",
    description: "A bit of everything — groceries, household, personal care and more.",
    icon: "Store",
    accentColor: "#ea580c",
    categories: [
      { name: "Groceries" },
      { name: "Household" },
      { name: "Personal Care" },
      { name: "Beverages" },
      { name: "Snacks" },
    ],
    brands: [{ name: "Nestlé" }, { name: "Unilever" }, { name: "Colgate" }, { name: "Generic" }],
    units: ["PCS", "KG", "LITRE", "PACK", "DOZEN"],
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock", "expiry"],
    sampleProducts: [
      { name: "Detergent Powder 1kg", sku: "GEN-001", salePrice: 450, categoryName: "Household", brandName: "Unilever", unit: "PACK", stock: 90, lowStockLimit: 15 },
      { name: "Toothpaste 100g", sku: "GEN-002", salePrice: 220, categoryName: "Personal Care", brandName: "Colgate", unit: "PCS", stock: 120, lowStockLimit: 20 },
      { name: "Biscuits Family Pack", sku: "GEN-003", salePrice: 150, categoryName: "Snacks", brandName: "Nestlé", unit: "PACK", stock: 200, lowStockLimit: 30 },
    ],
  },
  {
    key: "custom_business",
    label: "Custom Business",
    description: "Start blank and build your own categories, brands and units.",
    icon: "Settings2",
    accentColor: "#64748b",
    categories: [],
    brands: [],
    units: COMMON_UNITS,
    dashboardWidgets: ["kpis", "salesChart", "recentOrders", "lowStock"],
    sampleProducts: [],
  },
];

export type ModuleInfo = { key: string; label: string; group: string };

export const BUSINESS_MODULES: ModuleInfo[] = [
  { key: "erp", label: "ERP & Admin", group: "Core Platform" },
  { key: "pos", label: "POS Billing", group: "Core Platform" },
  { key: "inventory", label: "Inventory", group: "Core Platform" },
  { key: "reports", label: "Reports", group: "Core Platform" },
  { key: "onlineStore", label: "Online Store", group: "Sales Channels" },
  { key: "customerPortal", label: "Customer Portal", group: "Sales Channels" },
  { key: "customerApp", label: "Customer Mobile App", group: "Sales Channels" },
  { key: "employeeApp", label: "Employee / Admin App", group: "Sales Channels" },
  { key: "whatsapp", label: "WhatsApp Automation", group: "Features" },
  { key: "multiBranch", label: "Multi Branch", group: "Features" },
  { key: "multiBusiness", label: "Multi Business", group: "Features" },
  { key: "loyalty", label: "Loyalty Program", group: "Features" },
  { key: "coupons", label: "Coupons", group: "Features" },
  { key: "reviews", label: "Reviews & Ratings", group: "Features" },
];

export const DEFAULT_ENABLED_MODULES: Record<string, boolean> = Object.fromEntries(
  BUSINESS_MODULES.map((m) => [m.key, true]),
);

// Missing keys default to ENABLED so existing installs keep every feature visible.
export function resolveEnabledModules(stored: Record<string, boolean> | null | undefined): Record<string, boolean> {
  const out = { ...DEFAULT_ENABLED_MODULES };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored)) out[k] = !!v;
  }
  return out;
}

export function getPack(key: string): BusinessPackDef | undefined {
  return BUSINESS_PACKS.find((p) => p.key === key);
}

// Maps the original base-seed category names (created before Business Packs
// existed) to the business type that should own those products, so the store /
// customer app can filter the legacy catalog by the active business.
export const LEGACY_CATEGORY_BUSINESS_MAP: Record<string, string> = {
  Stationery: "stationery_store",
  Clothing: "garments",
  Electronics: "electronics",
  "Food & Beverages": "grocery_store",
};

// Idempotently stamps every product with the business type that owns it, based
// on its category. Only fills rows where business_type IS NULL, so it never
// overwrites an explicit tag and is safe to run on every boot and after each
// pack apply. Legacy base-seed categories take precedence, then each pack's own
// categories (earlier packs win on shared category names).
export async function tagProductBusinessTypes(): Promise<void> {
  const allCats = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name })
    .from(categoriesTable);
  const idsByName = new Map<string, number[]>();
  for (const c of allCats) {
    const arr = idsByName.get(c.name) ?? [];
    arr.push(c.id);
    idsByName.set(c.name, arr);
  }

  const apply = async (catNames: string[], biz: string): Promise<void> => {
    const ids = catNames.flatMap((n) => idsByName.get(n) ?? []);
    if (ids.length === 0) return;
    await db
      .update(productsTable)
      .set({ businessType: biz })
      .where(and(isNull(productsTable.businessType), inArray(productsTable.categoryId, ids)));
  };

  for (const [catName, biz] of Object.entries(LEGACY_CATEGORY_BUSINESS_MAP)) {
    await apply([catName], biz);
  }
  for (const pack of BUSINESS_PACKS) {
    if (pack.categories.length === 0) continue;
    await apply(
      pack.categories.map((c) => c.name),
      pack.key,
    );
  }
}

export function packLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return getPack(key)?.label ?? key;
}

export function packToApi(p: BusinessPackDef) {
  return {
    key: p.key,
    label: p.label,
    description: p.description,
    icon: p.icon,
    accentColor: p.accentColor,
    categories: p.categories.map((c) => c.name),
    brands: p.brands.map((b) => b.name),
    units: p.units,
    productCount: p.sampleProducts.length,
    dashboardWidgets: p.dashboardWidgets,
  };
}
