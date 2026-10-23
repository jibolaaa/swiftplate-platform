// "Did my payment go through?" The page Paystack sends you back to, and the
// phone app after its checkout closes, both ask here. We check with Paystack
// on the server; the answer only says paid or not and which order.
// No sign-in needed: the phone app opens Paystack in a browser that doesn't
// share its sign-in, and knowing a reference doesn't let you change anything.
import { requireDb } from "../../../../lib/db";
import { confirmPayment, paymentsReady } from "../../../../lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    if (!paymentsReady()) return Response.json({ error: "Payments aren't switched on yet." }, { status: 503 });
    const { reference } = await req.json().catch(() => ({}));
    if (!reference || typeof reference !== "string" || reference.length > 100)
      return Response.json({ error: "Missing payment reference." }, { status: 400 });
    const r = await confirmPayment(requireDb(), reference);
    if (!r.found) return Response.json({ error: "We don't know that payment." }, { status: 404 });
    return Response.json({ paid: r.paid, order_id: r.orderId, state: r.state || (r.paid ? "success" : "pending") });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
