import { customType } from "drizzle-orm/mysql-core";

// Cross-engine JSON column. drizzle-orm's built-in MySqlJson stringifies on
// write but has NO read-side mapper, so the value the app sees is whatever the
// driver returns. On real MySQL a native JSON column may come back parsed, but
// on MariaDB (used for local dev) JSON is an alias for LONGTEXT, so mysql2
// returns a raw string. This custom type parses on read regardless of engine,
// so JSON columns always surface as real objects/arrays.
export const jsonColumn = <TData>(name: string) =>
  customType<{ data: TData; driverData: string }>({
    dataType() {
      return "json";
    },
    toDriver(value: TData): string {
      return JSON.stringify(value);
    },
    fromDriver(value: string | TData): TData {
      return typeof value === "string" ? (JSON.parse(value) as TData) : value;
    },
  })(name);
