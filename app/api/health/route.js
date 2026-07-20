// Quick health check: proves the deploy works and the DB is reachable.
import { requireDb } from "../../../lib/db";

export async function GET() {
  try {
    const sql = requireDb();
    const [row] = await sql`SELECT now() AS db_time, current_database() AS db`;
    return Response.json({ ok: true, db: row.db, db_time: row.db_time });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
