// Generates a single, phpMyAdmin-importable database/schema.sql from the
// Drizzle schema. It runs `drizzle-kit generate` into a temp folder, then
// transforms the output for broad MySQL compatibility and appends the
// singleton configuration rows (whatsapp_config / business_config) whose
// JSON / TEXT columns cannot carry a SQL DEFAULT.
//
// Run with: pnpm --filter @workspace/db run gen:sql

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(dbDir, "../..");
const tmpOut = path.join(dbDir, "_gen");
const outFile = path.join(repoRoot, "database", "schema.sql");

rmSync(tmpOut, { recursive: true, force: true });

execFileSync(
  "npx",
  [
    "drizzle-kit",
    "generate",
    "--dialect",
    "mysql",
    "--schema",
    "./src/schema/index.ts",
    "--out",
    "./_gen",
  ],
  { cwd: dbDir, stdio: "inherit" },
);

const sqlFile = readdirSync(tmpOut).find((f) => f.endsWith(".sql"));
if (!sqlFile) {
  throw new Error("drizzle-kit produced no .sql file");
}

let sql = readFileSync(path.join(tmpOut, sqlFile), "utf8");
sql = sql.replace(/-->\s*statement-breakpoint\s*/g, "");
sql = sql.replace(/DEFAULT \(now\(\)\)/g, "DEFAULT CURRENT_TIMESTAMP");
sql = sql.replace(/CREATE TABLE `([^`]+)`/g, "DROP TABLE IF EXISTS `$1`;\nCREATE TABLE `$1`");
sql = sql.replace(/\);\n(DROP TABLE)/g, ");\n\n$1");
sql = sql.trim() + "\n";

const header = `-- Tech Mentor ERP & POS — MySQL schema
-- Importable via phpMyAdmin or: mysql -u USER -p DBNAME < database/schema.sql
-- Generated from the Drizzle schema (lib/db/src/schema). Do not hand-edit;
-- regenerate with: pnpm --filter @workspace/db run gen:sql
--
-- The application also runs an idempotent ensureSchema() + seed on boot, so a
-- fresh DB can be created either by importing this file or by booting the app.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = "NO_AUTO_VALUE_ON_ZERO";

`;

const singletons = `
-- Singleton configuration rows. These tables hold exactly one row (id = 1).
-- JSON / TEXT columns cannot carry a SQL DEFAULT, so the row is inserted here.
INSERT INTO \`whatsapp_config\` (\`id\`, \`custom_body_template\`)
VALUES (1, '{"to":"{{to}}","message":"{{message}}"}')
ON DUPLICATE KEY UPDATE \`id\` = \`id\`;

INSERT INTO \`business_config\` (\`id\`, \`active_business_types\`, \`enabled_modules\`, \`applied_packs\`)
VALUES (1, '[]', '{}', '[]')
ON DUPLICATE KEY UPDATE \`id\` = \`id\`;

SET FOREIGN_KEY_CHECKS = 1;
`;

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, header + sql + singletons);
rmSync(tmpOut, { recursive: true, force: true });

const tableCount = (sql.match(/CREATE TABLE/g) || []).length;
console.log(`Wrote ${path.relative(repoRoot, outFile)} (${tableCount} tables)`);
