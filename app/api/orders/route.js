// The central endpoints of the platform.
// POST: a CUSTOMER places an order (status starts at 'pending').
// GET:  each role sees a different slice of the same orders table:
//       customer -> their own, vendor -> their restaurant's,
//       rider -> assigned to them (+ ready ones available to claim),
//       admin -> use /api/admin/orders for everything.
import { requireDb } from "../../../lib/db";
import { requireAuth, authError } from "../../../lib/auth";

const DELIVERY_FEE_KOBO = 100000; // flat N1,000 for the demo

export async function POST(req) {
  try {
    const user = await requireAuth(req, ["customer"]);
    const { restaurant_id, items, delivery_address } = await req.json();
    if (!restaurant_id || !Array.isArray(items) || !items.length || !delivery_address)
      return Response.json({ error: "restaurant_id, items and delivery_address are required." }, { status: 400 });

    const sql = requireDb();

    // SECURITY: fetch real prices from the DB. The client sends only
    // menu_item ids + quantities; totals are computed here.
    const ids = items.map(i => i.menu_item_id);
    const menu = await sql`
      SELECT id, restaurant_id, name, price_kobo
      FROM menu_items
      WHERE id = ANY(${ids}) AND is_available = TRUE
    `;

    let subtotal = 0;
    const lines = [];
    for (const { menu_item_id, qty } of items) {
      const m = menu.find(x => x.id === menu_item_id);
      if (!m) return Response.json({ error: `Menu item not found: ${menu_item_id}` }, { status: 400 });
      if (m.restaurant_id !== restaurant_id)
        return Response.json({ error: "All items must belong to the same restaurant." }, { status: 400 });
      const q = Math.max(1, Math.min(20, parseInt(qty, 10) || 1));
      subtotal += m.price_kobo * q;
      lines.push({ m, q });
    }
    const total = subtotal + DELIVERY_FEE_KOBO;

    const [order] = await sql`
      INSERT INTO orders (customer_id, restaurant_id, status, delivery_address,
                          subtotal_kobo, delivery_fee_kobo, total_kobo)
      VALUES (${user.sub}, ${restaurant_id}, 'pending', ${delivery_address},
              ${subtotal}, ${DELIVERY_FEE_KOBO}, ${total})
      RETURNING *
    `;

    // Snapshot pattern: copy name + price into the order lines.
    for (const { m, q } of lines) {
      await sql`
        INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price_kobo, quantity)
        VALUES (${order.id}, ${m.id}, ${m.name}, ${m.price_kobo}, ${q})
      `;
    }
    await sql`
      INSERT INTO order_status_history (order_id, status, changed_by)
      VALUES (${order.id}, 'pending', ${user.sub})
    `;

    return Response.json({ order });
  } catch (e) {
    return e.status ? authError(e) : Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = await requireAuth(req); // any role
    const sql = requireDb();

    if (user.role === "customer") {
      const orders = await sql`
        SELECT o.*, r.name AS restaurant_name FROM orders o
        JOIN restaurants r ON r.id = o.restaurant_id
        WHERE o.customer_id = ${user.sub} ORDER BY o.created_at DESC LIMIT 20
      `;
      return Response.json({ orders });
    }

    if (user.role === "vendor") {
      const orders = await sql`
        SELECT o.*, u.full_name AS customer_name FROM orders o
        JOIN restaurants r ON r.id = o.restaurant_id
        JOIN users u ON u.id = o.customer_id
        WHERE r.owner_id = ${user.sub} ORDER BY o.created_at DESC LIMIT 20
      `;
      return Response.json({ orders });
    }

    if (user.role === "rider") {
      const assigned = await sql`
        SELECT o.*, r.name AS restaurant_name, r.address AS restaurant_address FROM orders o
        JOIN restaurants r ON r.id = o.restaurant_id
        WHERE o.rider_id = ${user.sub}
          AND o.status IN ('rider_assigned','picked_up')
        ORDER BY o.created_at DESC
      `;
      const available = await sql`
        SELECT o.*, r.name AS restaurant_name, r.address AS restaurant_address FROM orders o
        JOIN restaurants r ON r.id = o.restaurant_id
        WHERE o.status = 'ready' AND o.rider_id IS NULL
        ORDER BY o.created_at ASC
      `;
      return Response.json({ orders: assigned, available });
    }

    // admin falls through to the dedicated admin route
    return Response.json({ error: "Admins: use /api/admin/orders." }, { status: 400 });
  } catch (e) {
    return e.status ? authError(e) : Response.json({ error: e.message }, { status: 500 });
  }
}
