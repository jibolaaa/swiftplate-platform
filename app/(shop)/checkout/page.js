"use client";
// Checkout: check the order, add an address, sign in if needed, send it.
// The server works out the real prices and total; the numbers here are a preview.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "../../../components/CartProvider";
import { Lines, Totals } from "../../../components/OrderSummary";
import { ArrowLeft } from "../../../components/Icons";
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
          <Link href="/#kitchens" className="btn">See kitchens</Link>
        </div>
      </div>
    );
  }

  async function continueAsDemo() {
    setBusy(true);
    setError("");
    const r = await signIn(DEMO_CUSTOMER.email, DEMO_PASSWORD);
    setBusy(false);
    if (!r.ok) setError(r.data.error || "Couldn't sign in. Try again.");
  }

  async function place() {
    if (busy) return;
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
    if (r.status === 401) { setBusy(false); setError("Your sign-in ran out. Sign in again to send the order."); return; }
    if (!r.ok) { setBusy(false); setError(r.data.error || "The order didn't go through. Try again."); return; }
    try { localStorage.setItem("swiftplate_address", where); } catch {}
    cart.clear();
    router.push(`/orders/${r.data.order.id}`);
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
            <p>Pay the rider when your food arrives, by cash or transfer.</p>
            <p className="muted small">This is a demo, so no money changes hands.</p>
          </section>
        </div>
        <aside className="card" aria-label="Order total" style={{ position: "sticky", top: "calc(var(--header-h) + 16px)" }}>
          <h2>Total</h2>
          <Totals />
          {error && <p className="error" role="alert">{error}</p>}
          {me ? (
            <>
              <p className="muted small">Ordering as {me.full_name}.</p>
              <button type="button" className="btn full" onClick={place} disabled={busy}>{busy ? "Sending your order…" : `Place order, ${naira(cart.total)}`}</button>
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
