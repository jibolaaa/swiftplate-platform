import { requireDb } from "../../../../lib/db";
import { requireAuth, authError } from "../../../../lib/auth";

export async function GET(req) {
  try {
    await requireAuth(req, ["admin"]);
    const sql = requireDb();
    const orders = await sql`
      SELECT o.id, o.status, o.total_kobo, o.created_at,
             r.name AS restaurant, c.full_name AS customer, d.full_name AS rider,
             p.status AS payment_status
      FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      JOIN users c ON c.id = o.customer_id
      LEFT JOIN users d ON d.id = o.rider_id
      LEFT JOIN payments p ON p.order_id = o.id
      ORDER BY o.created_at DESC LIMIT 50
    `;
    const [stats] = await sql`
      SELECT count(*)::int AS total_orders,
             count(*) FILTER (WHERE o.status = 'delivered')::int AS delivered,
             coalesce(sum(o.total_kobo) FILTER (WHERE o.status = 'delivered'), 0)::bigint AS revenue_kobo,
             count(*) FILTER (WHERE p.status IN ('initiated', 'failed') AND o.status <> 'cancelled')::int AS unpaid
      FROM orders o LEFT JOIN payments p ON p.order_id = o.id
    `;
    return Response.json({ stats, orders });
  } catch (e) {
    return e.status ? authError(e) : Response.json({ error: e.message }, { status: 500 });
  }
}
