import { requireDb } from "../../../../lib/db";
import { requireAuth, authError } from "../../../../lib/auth";

export async function GET(req, { params }) {
  try {
    const user = await requireAuth(req);
    const sql = requireDb();
    const [order] = await sql`
      SELECT o.*, r.name AS restaurant_name, r.owner_id
      FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
      WHERE o.id = ${params.id}
    `;
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

    // Only people who are PART of this order (or admin) may see it.
    const allowed =
      user.role === "admin" ||
      order.customer_id === user.sub ||
      order.owner_id === user.sub ||
      order.rider_id === user.sub;
    if (!allowed) return Response.json({ error: "Not your order." }, { status: 403 });

    const items = await sql`
      SELECT item_name, unit_price_kobo, quantity FROM order_items WHERE order_id = ${order.id}
    `;
    const history = await sql`
      SELECT h.status, h.created_at, u.full_name AS by_name, u.role AS by_role
      FROM order_status_history h LEFT JOIN users u ON u.id = h.changed_by
      WHERE h.order_id = ${order.id} ORDER BY h.created_at
    `;
    return Response.json({ order, items, history });
  } catch (e) {
    return e.status ? authError(e) : Response.json({ error: e.message }, { status: 500 });
  }
}
