// Paying for an order with Paystack (test mode for the demo).
//
// The flow:
// 1. The customer places an order. It is saved with a payment row marked
//    'initiated', and the kitchen can't see it yet.
// 2. We ask Paystack for a checkout page (card or bank transfer) and send
//    the customer there.
// 3. Paystack sends them back to /pay/done/<order>. We ask Paystack
//    ourselves whether the money arrived, and check the amount matches the
//    order. Only then is the payment 'paid' and the order goes to the kitchen.
//    (Paystack's webhook does the same check if the customer never comes back.)
//
// The secret key stays on the server (PAYSTACK_SECRET_KEY). The browser and
// the phone app never see it.
import crypto from "node:crypto";

const BASE = process.env.PAYSTACK_API_BASE || "https://api.paystack.co";

export const paymentsReady = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

async function paystack(path, { method = "GET", body } = {}) {
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.status !== false, data };
  } catch {
    return { ok: false, data: { message: "Couldn't reach Paystack." } };
  }
}

// Paystack needs a new reference for every attempt, so paying again after
// closing the checkout gets a fresh one.
const newReference = (orderId) => `SP-${orderId.slice(0, 8)}-${Date.now().toString(36)}${crypto.randomInt(36 ** 3).toString(36)}`;

// The site's own address, for Paystack to send the customer back to.
export function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Start (or restart) paying for an order. Returns Paystack's checkout link.
export async function startPayment(sql, { order, email, origin }) {
  const reference = newReference(order.id);
  // One payment row per order: a new attempt replaces the old reference,
  // unless the order is already paid.
  const rows = await sql`
    INSERT INTO payments (order_id, amount_kobo, provider, provider_ref, status)
    VALUES (${order.id}, ${order.total_kobo}, 'paystack', ${reference}, 'initiated')
    ON CONFLICT (order_id) DO UPDATE
      SET provider_ref = EXCLUDED.provider_ref, amount_kobo = EXCLUDED.amount_kobo, status = 'initiated'
      WHERE payments.status IN ('initiated', 'failed')
    RETURNING id
  `;
  if (!rows.length) return { alreadyPaid: true };

  const r = await paystack("/transaction/initialize", {
    method: "POST",
    body: {
      email,
      amount: Number(order.total_kobo),
      currency: "NGN",
      reference,
      channels: ["card", "bank_transfer"],
      callback_url: `${origin}/pay/done/${order.id}`,
      metadata: { order_id: order.id, cancel_action: `${origin}/orders/${order.id}` }
    }
  });
  if (!r.ok || !r.data?.data?.authorization_url) {
    const err = new Error(r.data?.message || "Paystack didn't start the payment.");
    err.status = 502;
    throw err;
  }
  return { reference, url: r.data.data.authorization_url };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The order a Paystack transaction was for, from the metadata we sent when
// starting it (Paystack can hand it back as an object or as a string).
function orderFromMetadata(meta) {
  if (typeof meta === "string") { try { meta = JSON.parse(meta); } catch { return null; } }
  const id = meta?.order_id;
  return typeof id === "string" && UUID.test(id) ? id : null;
}

const paymentFor = (sql, column, value) => column === "ref"
  ? sql`SELECT p.order_id, p.status, o.total_kobo, o.status AS order_status FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.provider_ref = ${value}`
  : sql`SELECT p.order_id, p.status, o.total_kobo, o.status AS order_status FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.order_id = ${value}`;

// Ask Paystack whether a payment went through. Safe to call many times:
// it only marks the order paid once, and only for the right amount.
export async function confirmPayment(sql, reference) {
  let [p] = await paymentFor(sql, "ref", reference);
  if (p?.status === "paid") return { found: true, paid: true, orderId: p.order_id };
  if (p?.status === "refunded") return { found: true, paid: false, orderId: p.order_id, state: "refunded" };

  const r = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  const t = r.data?.data;

  // An older attempt for the same order: the customer opened Paystack,
  // came back, pressed Pay again (a new reference), then finished the first
  // one after all. Find the order from what we sent Paystack.
  if (!p && t) {
    const orderId = orderFromMetadata(t.metadata);
    if (orderId && reference.startsWith(`SP-${orderId.slice(0, 8)}-`)) {
      [p] = await paymentFor(sql, "order", orderId);
      if (p?.status === "paid") return { found: true, paid: true, orderId: p.order_id };
      if (p?.status === "refunded") return { found: true, paid: false, orderId: p.order_id, state: "refunded" };
    }
  }
  if (!p) return { found: false };
  if (!r.ok || !t) return { found: true, paid: false, orderId: p.order_id, state: "unknown" };
  if (t.status !== "success") return { found: true, paid: false, orderId: p.order_id, state: t.status };
  if (Number(t.amount) !== Number(p.total_kobo) || (t.currency && t.currency !== "NGN")) {
    await sql`UPDATE payments SET status = 'failed' WHERE order_id = ${p.order_id} AND provider_ref = ${reference} AND status IN ('initiated', 'failed')`;
    return { found: true, paid: false, orderId: p.order_id, state: "wrong_amount" };
  }

  // Keep the reference that was actually paid, so a refund goes to it.
  const marked = await sql`
    UPDATE payments SET status = 'paid', paid_at = now(), provider_ref = ${reference}
    WHERE order_id = ${p.order_id} AND status IN ('initiated', 'failed')
    RETURNING order_id
  `;
  if (!marked.length) {
    const [now] = await paymentFor(sql, "order", p.order_id);
    return { found: true, paid: now?.status === "paid", orderId: p.order_id, state: now?.status };
  }
  // Paid for an order that was already cancelled (say, the checkout was
  // left open in another tab): give the money straight back.
  if (p.order_status === "cancelled") {
    const back = await refundPayment(sql, p.order_id);
    return { found: true, paid: false, orderId: p.order_id, state: back.refunded ? "refunded" : "cancelled" };
  }
  await sql`INSERT INTO order_status_history (order_id, status, changed_by) VALUES (${p.order_id}, 'paid', NULL)`;
  return { found: true, paid: true, orderId: p.order_id };
}

// Give the money back when a paid order is cancelled before the kitchen
// accepts it. Best effort: if Paystack says no, the order still cancels.
export async function refundPayment(sql, orderId) {
  const [p] = await sql`SELECT provider_ref, status FROM payments WHERE order_id = ${orderId}`;
  if (!p || p.status !== "paid") return { refunded: false };
  const r = await paystack("/refund", { method: "POST", body: { transaction: p.provider_ref } });
  if (r.ok) await sql`UPDATE payments SET status = 'refunded' WHERE order_id = ${orderId}`;
  return { refunded: r.ok };
}

// Paystack signs every webhook with the secret key (HMAC SHA-512 of the body).
export function validWebhook(rawBody, signature) {
  if (!process.env.PAYSTACK_SECRET_KEY || !signature) return false;
  const expected = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
