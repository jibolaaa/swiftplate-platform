// "I've paid, check again": asks Paystack about this order's latest payment
// attempt. For when you pay and come back without passing through
// /pay/done (for example with the back button).
import { requireDb } from "../../../../../lib/db";
import { requireAuth, authError } from "../../../../../lib/auth";
import { confirmPayment, paymentsReady } from "../../../../../lib/payments";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req, { params }) {
  try {
    const user = await requireAuth(req, ["customer"]);
    if (!UUID.test(String(params.id))) return Response.json({ error: "Order not found." }, { status: 404 });
    if (!paymentsReady()) return Response.json({ error: "Payments aren't switched on yet." }, { status: 503 });
    const sql = requireDb();
    const [row] = await sql`
      SELECT o.customer_id, p.provider_ref, p.status
      FROM orders o LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.id = ${params.id}
    `;
    if (!row) return Response.json({ error: "Order not found." }, { status: 404 });
    if (row.customer_id !== user.sub) return Response.json({ error: "Not your order." }, { status: 403 });
    if (!row.provider_ref) return Response.json({ paid: true }); // from before payments
    const r = await confirmPayment(sql, row.provider_ref);
    return Response.json({ paid: r.paid, state: r.state || (r.paid ? "success" : "pending") });
  } catch (e) {
    return e.status ? authError(e) : Response.json({ error: e.message }, { status: 500 });
  }
}
