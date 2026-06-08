import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// MYSQL_URL is a dev-only override (Replit preview uses a local MariaDB).
// In production (e.g. Hostinger) set DATABASE_URL to your MySQL connection string.
const connectionString = process.env.MYSQL_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enable TLS when the platform requires it (e.g. a public MySQL URL). Internal
// URLs and the local dev DB do not use SSL.
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  /[?&]ssl(mode)?=/i.test(connectionString);

export const pool = mysql.createPool({
  uri: connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool, { schema, mode: "default" });

export * from "./schema";
