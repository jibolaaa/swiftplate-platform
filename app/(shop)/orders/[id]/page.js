"use client";
// Live tracking for one order. It asks the server every 5 seconds while
// the order is moving, and stops once it's delivered or cancelled.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, getSession } from "../../../../lib/clientApi";
import { CheckIcon } from "../../../../components/Icons";
import { STEPS, lagosTime, naira, shortId, stepIndex } from "../../../../lib/food";

export default function TrackOrder({ params }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const finished = useRef(false);

  const load = useCallback(async () => {
    if (!getSession("customer")) { setSignedOut(true); return; }
    const r = await api(`/api/orders/${params.id}`, { role: "customer" });
    if (r.status === 401) { setSignedOut(true); return; }
    if (!r.ok) { setError(r.data.error || "Couldn't load this order."); return; }
    setError("");
    setData(r.data);
    finished.current = ["delivered", "cancelled"].includes(r.data.order.status);
  }, [params.id]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!finished.current && !document.hidden) load(); }, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function cancel() {
    setCancelling(true);
    const r = await api(`/api/orders/${params.id}/transition`, { role: "customer", method: "POST", body: JSON.stringify({ action: "cancel", reason: "Cancelled by customer" }) });
    setCancelling(false);
    setAskCancel(false);
    if (!r.ok) setError(r.data.error || "Couldn't cancel. Try again.");
    load();
  }

  if (signedOut) {
    return (
      <div className="wrap page"><div className="empty">
        <h1 className="title">Sign in to follow this order</h1>
        <Link href={`/login?as=customer&next=/orders/${params.id}`} className="btn">Sign in</Link>
      </div></div>
    );
  }
  if (!data) return <div className="wrap page">{error ? <p className="error">{error}</p> : <p className="muted">Loading your order…</p>}</div>;

  const { order, items, history } = data;
  const cancelled = order.status === "cancelled";
  const now = stepIndex(order.status);
  const step = STEPS[now] || STEPS[0];
  const when = {};
  for (const h of history) if (!when[h.status]) when[h.status] = h.created_at;
  const moving = !cancelled && order.status !== "delivered";

  return (
    <div className="wrap page">
      <div className="two">
        <div style={{ display: "grid", gap: 16 }}>
          <section className="card track-head" aria-live="polite">
            <p className="eyebrow">Order #{shortId(order.id)} from {order.restaurant_name}</p>
            <h1 className="title">{cancelled ? "Cancelled" : step.label}</h1>
            <p className="muted">{cancelled ? (order.cancel_reason || "This order was cancelled.") : step.note}</p>
            {!cancelled && (
              <div className="bar" aria-hidden="true">
                {STEPS.map((s, i) => <i key={s.key} className={i < now || order.status === "delivered" ? "on" : i === now ? "now" : ""} />)}
              </div>
            )}
            {moving && <p className="live">Updates by itself</p>}
          </section>

          <section className="card" aria-labelledby="tl-title">
            <h2 id="tl-title">Every step</h2>
            <ol className="timeline">
              {STEPS.map((s, i) => {
                const done = !cancelled && (i < now || order.status === "delivered");
                const cls = done ? "done" : !cancelled && i === now ? "now" : "todo";
                return (
                  <li key={s.key} className={`tl ${cls}`}>
                    <span className="pt" aria-hidden="true">{done && <CheckIcon />}</span>
                    <span><b>{s.label}</b>{cls === "now" && <span>{s.note}</span>}</span>
                    <time>{when[s.key] ? lagosTime(when[s.key]) : ""}</time>
                  </li>
                );
              })}
            </ol>
          </section>

          {moving && (
            <section className="note-box" style={{ display: "grid", gap: 10 }}>
              <b>Try the other side</b>
              <span>This order needs a kitchen and a rider to move. Open their screens in new tabs, accept and deliver it, and watch each step land here.</span>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <a className="btn small ink" href="/vendor" target="_blank" rel="noopener">Open the kitchen</a>
                <a className="btn small ghost" href="/rider" target="_blank" rel="noopener">Open the rider app</a>
              </span>
            </section>
          )}
        </div>

        <aside className="card" aria-labelledby="d-title">
          <h2 id="d-title">Your order</h2>
          <ul className="lines">
            {items.map((it, i) => (
              <li key={i} className="line">
                <span className="line-name">{it.quantity} × {it.item_name}</span>
                <span>{naira(it.unit_price_kobo * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="sum">
            <div><span className="muted">Food</span><span>{naira(order.subtotal_kobo)}</span></div>
            <div><span className="muted">Delivery</span><span>{naira(order.delivery_fee_kobo)}</span></div>
            <div className="total"><span>Total</span><span>{naira(order.total_kobo)}</span></div>
          </div>
          <p className="small"><span className="muted">To:</span> {order.delivery_address}</p>
          <p className="small muted">Pay the rider on delivery.</p>
          {error && <p className="error">{error}</p>}
          {order.status === "pending" && !askCancel && (
            <button type="button" className="btn ghost full" onClick={() => setAskCancel(true)}>Cancel order</button>
          )}
          {order.status === "pending" && askCancel && (
            <div className="note-box" role="group" aria-label="Confirm cancelling" style={{ display: "grid", gap: 10 }}>
              <b>Cancel this order?</b>
              <span className="small">You can only cancel before the kitchen accepts it.</span>
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn small" onClick={cancel} disabled={cancelling}>{cancelling ? "Cancelling…" : "Yes, cancel it"}</button>
                <button type="button" className="btn small ghost" onClick={() => setAskCancel(false)} disabled={cancelling}>Keep it</button>
              </span>
            </div>
          )}
          <Link href="/orders" className="link small">All your orders</Link>
        </aside>
      </div>
    </div>
  );
}
