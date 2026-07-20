import { requireDb } from "../../../../lib/db";
import { requireAuth, authError } from "../../../../lib/auth";

export async function GET(req) {
  try {
    await requireAuth(req, ["admin"]);
    const sql = requireDb();
    const orders = await sql`
      SELECT o.id, o.status, o.total_kobo, o.created_at,
             r.name AS restaurant, c.full_name AS customer, d.full_name AS rider
      FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      JOIN users c ON c.id = o.customer_id
      LEFT JOIN users d ON d.id = o.rider_id
      ORDER BY o.created_at DESC LIMIT 50
    `;
    const [stats] = await sql`
      SELECT count(*)::int AS total_orders,
             count(*) FILTER (WHERE status = 'delivered')::int AS delivered,
             coalesce(sum(total_kobo) FILTER (WHERE status = 'delivered'), 0)::bigint AS revenue_kobo
      FROM orders
    `;
    return Response.json({ stats, orders });
  } catch (e) {
    return e.status ? authError(e) : Response.json({ error: e.message }, { status: 500 });
  }
}
