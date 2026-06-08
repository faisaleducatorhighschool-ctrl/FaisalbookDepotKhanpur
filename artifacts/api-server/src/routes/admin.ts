import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Clear all transactional history (sales, orders, purchases, inventory,
// ledger, etc.) and zero every product's stock. The product catalog and all
// other master data (customers, suppliers, employees, settings) are kept.
// Destructive: gated behind admin authorization, not just authentication.
router.post("/admin/reset-data", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  // No FK constraints exist between these tables, so TRUNCATE order is irrelevant.
  // TRUNCATE in MySQL also resets AUTO_INCREMENT (equivalent to RESTART IDENTITY).
  const tables = [
    "sale_items", "sales",
    "order_items", "orders",
    "purchase_items", "purchases",
    "purchase_return_items", "purchase_returns",
    "inventory_movements", "ledger_entries", "cash_collections", "expenses",
    "customer_transactions", "supplier_transactions",
    "whatsapp_logs", "notifications", "delivery_assignments",
  ];
  for (const t of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE \`${t}\``));
  }
  await db.execute(sql`UPDATE products SET stock = 0`);
  // Advance balances are column-backed (not live-derived), so they must be zeroed
  // explicitly — truncating the transaction tables alone leaves stale balances.
  await db.execute(sql`UPDATE customers SET advance_balance = 0, advance_paid_balance = 0`);
  await db.execute(sql`UPDATE suppliers SET advance_balance = 0, advance_paid_balance = 0`);
  req.log.info("All transactional data reset by admin");
  res.json({
    success: true,
    message: "All sales, purchases and history cleared. Product catalog kept; stock set to 0.",
  });
});

export default router;
