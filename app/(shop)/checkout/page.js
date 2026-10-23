"use client";
// Checkout: check the order, add an address, sign in if needed, then pay.
// Paying opens Paystack (card or bank transfer). The order only reaches the
// kitchen once Paystack confirms the money, so tapping a button by mistake
// never sends food anywhere. The server works out the real prices and total;
// the numbers here are a preview.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "../../../components/CartProvider";
import { Lines, Totals } from "../../../components/OrderSummary";
import { ArrowLeft } from "../../../components/Icons";
import TestCard from "../../../components/TestCard";
import { api, getSession, signIn } from "../../../lib/clientApi";
import { DEMO_PASSWORD, DEMO_PEOPLE } from "../../../lib/roles";
import { naira } from "../../../lib/food";

const DEMO_CUSTOMER = DEMO_PEOPLE.find(p => p.role === "customer");

export default function CheckoutPage() {
  const cart = useCart();
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Right after signing in, the Pay button appears where the sign-in button
  // was. Hold it for a moment so a double tap can't press both.
  const [settling, setSettling] = useState(false);
  const settleTimer = useRef(null);
  useEffect(() => () => clearTimeout(settleTimer.current), []);

  useEffect(() => {
    const read = () => setMe(getSession("customer")?.user || null);
    read();
    try { setAddress(localStorage.getItem("swiftplate_address") || ""); } catch {}
    window.addEventListener("swiftplate:session", read);
    return () => window.removeEventListener("swiftplate:session", read);
  }, []);

  if (!cart.loaded) return <div className="wrap page"><p className="muted">Loading your order…</p></div>;

  if (!cart.count) {
    return (
      <div className="wrap page">
        <div className="empty">
          <h1 className="title">Your order is empty</h1>
          <p className="muted">Pick a kitchen and tap + on anything you fancy.</p>
          <Link href="/kitchens" className="btn">See kitchens</Link>
        </div>
      </div>
    );
  }

  async function continueAsDemo() {
    setBusy(true);
    setError("");
    const r = await signIn(DEMO_CUSTOMER.email, DEMO_PASSWORD);
    setBusy(false);
    if (!r.ok) { setError(r.data.error || "Couldn't sign in. Try again."); return; }
    setSettling(true);
    settleTimer.current = setTimeout(() => setSettling(false), 900);
  }

  async function pay() {
    if (busy || settling) return;
    const where = address.trim();
    if (where.length < 8) { setError("Add a delivery address with the street and area, like 5 Sabo Road, Yaba."); return; }
    setBusy(true);
    setError("");
    const r = await api("/api/orders", {
      role: "customer",
      method: "POST",
      body: JSON.stringify({
        restaurant_id: cart.kitchen.id,
        items: cart.lines.map(l => ({ menu_item_id: l.id, qty: l.qty })),
        delivery_address: where
      })
    });
    if (r.status === 401) { setBusy(false); setError("Your sign-in ran out. Sign in again to pay."); return; }
    if (!r.ok) { setBusy(false); setError(r.data.error || "That didn't go through. Try again."); return; }
    try { localStorage.setItem("swiftplate_address", where); } catch {}
    cart.clear();
    // Off to Paystack. If it couldn't start, the order page has a Pay button.
    if (r.data.payment?.url) window.location.assign(r.data.payment.url);
    else router.push(`/orders/${r.data.order.id}?pay=failed`);
  }

  return (
    <div className="wrap page">
      <div className="page-head">
        <Link href={`/r/${cart.kitchen.id}`} className="small muted" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><ArrowLeft width="16" height="16" /> Back to {cart.kitchen.name}</Link>
        <h1 className="title">Checkout</h1>
      </div>
      <div className="two">
        <div style={{ display: "grid", gap: 16 }}>
          <section className="card" aria-labelledby="o-title">
            <h2 id="o-title">From {cart.kitchen.name}</h2>
            <Lines />
            <Link href={`/r/${cart.kitchen.id}`} className="link small" style={{ justifySelf: "start" }}>Add more dishes</Link>
          </section>
          <section className="card" aria-labelledby="a-title">
            <h2 id="a-title">Where should we bring it?</h2>
            <label className="field">
              <span className="sr-only">Delivery address</span>
              <input className="input" value={address} onChange={e => { setAddress(e.target.value); setError(""); }} placeholder="5 Sabo Road, Yaba, Lagos" autoComplete="street-address" maxLength={200} />
            </label>
            <p className="muted small">Street, area and a landmark help the rider find you.</p>
          </section>
          <section className="card" aria-labelledby="p-title">
            <h2 id="p-title">Payment</h2>
            <p>Pay now by card or bank transfer. Paystack handles the payment, and the kitchen starts on your order once it's paid.</p>
            <TestCard />
          </section>
        </div>
        <aside className="card" aria-label="Order total" style={{ position: "sticky", top: "calc(var(--header-h) + 16px)" }}>
          <h2>Total</h2>
          <Totals />
          {error && <p className="error" role="alert">{error}</p>}
          {me ? (
            <>
              <p className="muted small">Ordering as {me.full_name}.</p>
              <button type="button" className="btn full" onClick={pay} disabled={busy || settling}>{busy ? "Opening Paystack…" : `Pay ${naira(cart.total)}`}</button>
              <p className="muted small">You'll pay on Paystack's secure page, then come straight back here.</p>
            </>
          ) : (
            <>
              <p className="small">Sign in to send your order.</p>
              <button type="button" className="btn full" onClick={continueAsDemo} disabled={busy}>{busy ? "Signing in…" : `Continue as ${DEMO_CUSTOMER.name}, the demo customer`}</button>
              <Link href="/login?as=customer&next=/checkout" className="btn ghost full">Sign in with email</Link>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
