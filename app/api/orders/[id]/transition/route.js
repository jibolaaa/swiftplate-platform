// ===== THE ORDER STATE MACHINE =====
// One endpoint moves an order between states. The TRANSITIONS table
// below is the whole business logic of the platform in one place:
// who may do what, and from which state to which.
//
//   pending -> accepted -> preparing -> ready -> rider_assigned
//           -> picked_up -> delivered        (or cancelled)
//
// RBAC + ownership: it is not enough to BE a vendor; you must be the
// vendor who OWNS this order's restaurant. Same for riders.
import { requireDb } from "../../../../../lib/db";
import { requireAuth, authError } from "../../../../../lib/auth";

const TRANSITIONS = {
  accept:    { role: "vendor", from: ["pending"],        to: "accepted" },
  preparing: { role: "vendor", from: ["accepted"],       to: "preparing" },
  ready:     { role: "vendor", from: ["preparing"],      to: "ready" },
  claim:     { role: "rider",  from: ["ready"],          to: "rider_assigned" },
  pickup:    { role: "rider",  from: ["rider_assigned"], to: "picked_up" },
  deliver:   { role: "rider",  from: ["picked_up"],      to: "delivered" },
  cancel:    { role: null,     from: null,               to: "cancelled" } // special-cased below
};

export async function POST(req, { params }) {
  try {
    const user = await requireAuth(req);
    const { action, reason } = await req.json();
    const t = TRANSITIONS[action];
    if (!t) return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

    const sql = requireDb();
    const [order] = await sql`SELECT * FROM orders WHERE id = ${params.id}`;
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

    // ---- cancel: customer (own, pending only) or admin (not delivered) ----
    if (action === "cancel") {
      const isOwner = user.role === "customer" && order.customer_id === user.sub;
      const isAdmin = user.role === "admin";
      if (!isOwner && !isAdmin)
        return Response.json({ error: "Only the customer or an admin can cancel." }, { status: 403 });
      if (isOwner && order.status !== "pending")
        return Response.json({ error: "You can only cancel while the order is pending." }, { status: 403 });
      if (["delivered", "cancelled"].includes(order.status))
        return Response.json({ error: `Cannot cancel a ${order.status} order.` }, { status: 400 });
    } else {
      // ---- normal transitions ----
      if (user.role !== t.role && user.role !== "admin")
        return Response.json({ error: `Forbidden: '${action}' requires role ${t.role}.` }, { status: 403 });
      if (!t.from.includes(order.status))
        return Response.json(
          { error: `Cannot '${action}' from status '${order.status}'. Allowed from: ${t.from.join(", ")}.` },
          { status: 409 }
        );

      // ---- ownership checks (RBAC beyond just the role) ----
      if (t.role === "vendor" && user.role === "vendor") {
        const [rest] = await sql`SELECT owner_id FROM restaurants WHERE id = ${order.restaurant_id}`;
        if (rest.owner_id !== user.sub)
          return Response.json({ error: "This order belongs to another vendor's restaurant." }, { status: 403 });
      }
      if (action === "claim" && order.rider_id)
        return Response.json({ error: "Another rider already claimed this order." }, { status: 409 });
      if (["pickup", "deliver"].includes(action) && user.role === "rider" && order.rider_id !== user.sub)
        return Response.json({ error: "This order is assigned to another rider." }, { status: 403 });
    }

    // ---- apply the transition ----
    const riderSet = action === "claim" ? user.sub : order.rider_id;
    const [updated] = await sql`
      UPDATE orders
      SET status = ${t.to},
          rider_id = ${riderSet},
          cancel_reason = ${action === "cancel" ? (reason || "cancelled") : order.cancel_reason},
          updated_at = now()
      WHERE id = ${order.id}
      RETURNING *
    `;
    await sql`
      INSERT INTO order_status_history (order_id, status, changed_by)
      VALUES (${order.id}, ${t.to}, ${user.sub})
    `;
    return Response.json({ order: updated, moved: `${order.status} -> ${t.to}`, by: user.role });
  } catch (e) {
    return e.status ? authError(e) : Response.json({ error: e.message }, { status: 500 });
  }
}
