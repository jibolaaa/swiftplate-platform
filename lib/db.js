// One database helper for the whole platform.
// Neon's serverless driver works over HTTP, which is exactly what
// Vercel's serverless functions need (no long-lived connections).
//
// On a laptop with plain Postgres, set DATABASE_DRIVER=pg: the same
// sql`...` queries then run through node-postgres instead (a dev-only
// dependency that the live site never loads).
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;

if (!url) {
  console.warn("DATABASE_URL is not set. API routes that need the DB will fail.");
}

function localSql(connectionString) {
  let pool;
  return async (strings, ...values) => {
    if (!pool) {
      const { default: pg } = await import(/* webpackIgnore: true */ "pg");
      pool = new pg.Pool({ connectionString, max: 3 });
    }
    // sql`a ${x} b ${y}` becomes "a $1 b $2" with [x, y], so values are
    // always sent as parameters, never pasted into the SQL.
    const text = strings.reduce((acc, part, i) => `${acc}$${i}${part}`);
    const { rows } = await pool.query(text, values);
    return rows;
  };
}

export const sql = !url ? null : process.env.DATABASE_DRIVER === "pg" ? localSql(url) : neon(url);

export function requireDb() {
  if (!sql) throw new Error("Database not configured (missing DATABASE_URL).");
  return sql;
}
