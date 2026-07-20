// One database helper for the whole platform.
// Neon's serverless driver works over HTTP, which is exactly what
// Vercel's serverless functions need (no long-lived connections).
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. API routes that need the DB will fail.");
}

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export function requireDb() {
  if (!sql) throw new Error("Database not configured (missing DATABASE_URL).");
  return sql;
}
