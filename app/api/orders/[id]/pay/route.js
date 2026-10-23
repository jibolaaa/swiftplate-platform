// Pay (or try paying again) for an order you placed but haven't paid for.
// Returns a fresh Paystack checkout link.
import { requireDb } from "../../../../../lib/db";
import { requireAuth, authError } from "../../../../../lib/auth";
import { confirmPayment, paymentsReady, siteOrigin, startPayment } from "../../../../../lib/payments";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req, { params }) {
  try {
    const user = await requireAuth(req, ["customer"]);
    if (!UUID.test(String(params.id))) return Response.json({ error: "Order not found." }, { status: 404 });
    if (!paymentsReady()) return Response.json({ error: "Payments aren't switched on yet." }, { status: 503 });
    const sql = requireDb();
    const [order] = await sql`SELECT * FROM orders WHERE id = ${params.id}`;
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    if (order.customer_id !== user.sub) return Response.json({ error: "Not your order." }, { status: 403 });
    if (order.status === "cancelled") return Response.json({ error: "This order was cancelled." }, { status: 409 });

    // Paid already on the last attempt (and came back another way)? Then
    // don't start a second payment.
    const [cur] = await sql`SELECT provider_ref, status FROM payments WHERE order_id = ${order.id}`;
    if (cur?.status === "paid") return Response.json({ paid: true });
    if (cur?.provider_ref && cur.status === "initiated") {
      const r = await confirmPayment(sql, cur.provider_ref);
      if (r.paid) return Response.json({ paid: true });
    }

    const [me] = await sql`SELECT email FROM users WHERE id = ${user.sub}`;
    const payment = await startPayment(sql, { order, email: me.email, origin: siteOrigin(req) });
    if (payment.alreadyPaid) return Response.json({ paid: true });
    return Response.json({ payment });
  } catch (e) {
    return e.status ? authError(e) : Response.json({ error: e.message }, { status: 500 });
  }
}
