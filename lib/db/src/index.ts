import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;

// Enable TLS when the platform requires it (e.g. Railway's public/external
// Postgres URL). Internal/private URLs and the local dev DB do not use SSL.
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  /[?&]sslmode=require/i.test(connectionString);

export const pool = new Pool({
  connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
