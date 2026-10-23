// Paystack calls this when a payment succeeds, in case the customer pays
// and never comes back to the site (closed the tab, lost signal).
// To switch it on, add this URL in Paystack: Settings, API Keys & Webhooks,
// Test Webhook URL: https://<your site>/api/paystack/webhook
import { requireDb } from "../../../../lib/db";
import { confirmPayment, validWebhook } from "../../../../lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const raw = await req.text();
  if (!validWebhook(raw, req.headers.get("x-paystack-signature")))
    return Response.json({ error: "Bad signature." }, { status: 401 });
  try {
    const event = JSON.parse(raw);
    // We don't trust the event's own numbers: confirmPayment asks Paystack again.
    if (event.event === "charge.success" && event.data?.reference)
      await confirmPayment(requireDb(), String(event.data.reference));
  } catch (e) {
    console.error("paystack webhook", e);
  }
  return Response.json({ received: true });
}
