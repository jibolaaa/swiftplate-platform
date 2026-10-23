"use client";
// One order, from paying to your door. Unpaid: a Pay button (Paystack, card
// or transfer). Paid: when it should arrive, where the food is now on a
// drawn route, and every step with its time. It checks the server every
// 5 seconds while the order is moving and stops once it's delivered.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, getSession } from "../../../../lib/clientApi";
import { CheckIcon } from "../../../../components/Icons";
import RouteMap from "../../../../components/RouteMap";
import TestCard from "../../../../components/TestCard";
import { MILESTONES, estimate, firstTimes, isPaid, lagosTime, naira, reached, shortId } from "../../../../lib/food";

function whereText(where, { kitchen, rider, left, address }) {
  switch (where) {
    case "waiting": return `At ${kitchen}, waiting to be accepted`;
    case "cooking": return `Being cooked at ${kitchen}`;
    case "packed": return `Packed at ${kitchen}, finding a rider`;
    case "to_kitchen": return `${rider || "Your rider"} is heading to ${kitchen}`;
    case "on_the_way": return `With ${rider || "your rider"}, about ${left} min from you`;
    case "delivered": return `Delivered to ${address}`;
    default: return "";
  }
}

export default function TrackOrder({ params }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [checking, setChecking] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const finished = useRef(false);
  const unpaid = useRef(false);

  const load = useCallback(async () => {
    if (!getSession("customer")) { setSignedOut(true); return; }
    const r = await api(`/api/orders/${params.id}`, { role: "customer" });
    if (r.status === 401) { setSignedOut(true); return; }
    if (!r.ok) { setError(r.data.error || "Couldn't load this order."); return; }
    setError("");
    setData(r.data);
    setNow(Date.now());
    finished.current = ["delivered", "cancelled"].includes(r.data.order.status);
    unpaid.current = !isPaid(r.data.payment) && r.data.order.status !== "cancelled";
  }, [params.id]);

  // Ask Paystack (through our server) whether an unpaid order has been paid.
  const checkPayment = useCallback(async (byHand) => {
    if (byHand) setChecking(true);
    const r = await api(`/api/orders/${params.id}/check-payment`, { role: "customer", method: "POST" });
    if (byHand) {
      setChecking(false);
      if (r.ok && !r.data.paid) setPayError("We haven't got the payment yet. If you paid by transfer it can take a minute.");
      if (!r.ok) setPayError(r.data.error || "Couldn't check right now. Try again.");
    }
    if (r.ok && r.data.paid) { setPayError(""); load(); }
  }, [params.id, load]);

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("pay") === "failed")
        setPayError("Paystack didn't open. Try paying again.");
    } catch {}
    load().then(() => { if (unpaid.current) checkPayment(false); });
    let ticks = 0;
    const t = setInterval(() => {
      if (document.hidden || finished.current) return;
      ticks += 1;
      if (unpaid.current) { if (ticks % 2 === 0 && ticks < 40) checkPayment(false); }
      else load();
    }, 5000);
    const clock = setInterval(() => setNow(Date.now()), 20000);
    return () => { clearInterval(t); clearInterval(clock); };
  }, [load, checkPayment]);

  async function pay() {
    setPaying(true); setPayError("");
    const r = await api(`/api/orders/${params.id}/pay`, { role: "customer", method: "POST" });
    if (r.ok && r.data.payment?.url) { window.location.assign(r.data.payment.url); return; }
    setPaying(false);
    if (r.ok && r.data.paid) { load(); return; }
    setPayError(r.data.error || "Couldn't open Paystack. Try again.");
  }

  async function cancel() {
    setCancelling(true);
    const r = await api(`/api/orders/${params.id}/transition`, { role: "customer", method: "POST", body: JSON.stringify({ action: "cancel", reason: "Cancelled by customer" }) });
    setCancelling(false);
    setAskCancel(false);
    if (!r.ok) { setError(r.data.error || "Couldn't cancel. Try again."); load(); return; }
    await load();
    window.scrollTo({ top: 0, behavior: "smooth" }); // the "Cancelled" card is at the top
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

  const { order, items, history, payment } = data;
  const paid = isPaid(payment);
  const cancelled = order.status === "cancelled";
  const idx = reached(order.status, paid);
  const times = firstTimes(history, payment);
  const eta = estimate({ status: order.status, paid, times, now });
  const step = idx >= 0 ? MILESTONES[idx] : null;
  const kitchen = order.restaurant_name;
  const rider = order.rider_name?.split(" ")[0];

  return (
    <div className="wrap page">
      <Link href="/orders" className="small muted back-link">← Your orders</Link>
      <div className="two">
        <div style={{ display: "grid", gap: 16 }}>
          {cancelled && (
            <section className="card track-head">
              <p className="eyebrow">Order #{shortId(order.id)} from {kitchen}</p>
              <h1 className="title">Cancelled</h1>
              <p className="muted">{order.cancel_reason || "This order was cancelled."}</p>
              {payment?.status === "refunded" && <p className="okay">Your money is on its way back to you.</p>}
            </section>
          )}

          {!cancelled && !paid && (
            <section className="card track-head pay-card">
              <p className="eyebrow">Order #{shortId(order.id)} from {kitchen}</p>
              <h1 className="title">Waiting for your payment</h1>
              <p className="muted">The kitchen gets your order as soon as you've paid. Pay by card or bank transfer.</p>
              {payError && <p className="error" role="alert">{payError}</p>}
              <button type="button" className="btn full" onClick={pay} disabled={paying}>{paying ? "Opening Paystack…" : `Pay ${naira(order.total_kobo)}`}</button>
              <button type="button" className="btn ghost full" onClick={() => checkPayment(true)} disabled={checking}>{checking ? "Checking…" : "I've paid, check again"}</button>
              <TestCard />
            </section>
          )}

          {!cancelled && paid && (
            <section className="card track-head" aria-live="polite">
              <p className="eyebrow">Order #{shortId(order.id)} from {kitchen}</p>
              <h1 className="title">{step.label}</h1>
              <p className="muted">{order.status === "delivered" ? `Delivered at ${lagosTime(times.delivered || order.updated_at)}` : step.note}</p>
              {eta && order.status !== "delivered" && (
                <div className="eta">
                  <span className="eta-label">Arriving around</span>
                  <b className="eta-time">{eta.where === "on_the_way" && eta.left <= 3 ? "Any minute now" : lagosTime(eta.arriveAt)}</b>
                  <span className="muted small">About {eta.left} min. Estimated from how long each step usually takes.</span>
                </div>
              )}
              {eta && <p className="where"><b>Now:</b> {whereText(eta.where, { kitchen, rider, left: eta.left, address: order.delivery_address })}</p>}
              {eta && <RouteMap where={eta.where} progress={eta.progress} kitchen={kitchen} rider={rider} />}
              <div className="bar" aria-hidden="true">
                {MILESTONES.map((m, i) => <i key={m.key} className={i <= idx ? "on" : ""} />)}
              </div>
            </section>
          )}

          {!cancelled && paid && (
            <section className="card" aria-labelledby="tl-title">
              <h2 id="tl-title">Every step</h2>
              <ol className="timeline">
                {MILESTONES.map((m, i) => {
                  const done = i <= idx;
                  const cls = done ? "done" : i === idx + 1 ? "now" : "todo";
                  return (
                    <li key={m.key} className={`tl ${cls}`}>
                      <span className="pt" aria-hidden="true">{done && <CheckIcon />}</span>
                      <span><b>{m.label}</b>{cls === "now" && <span>Next</span>}</span>
                      <time>{times[m.key === "paid" ? "paid" : m.key] ? lagosTime(times[m.key]) : ""}</time>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {!cancelled && paid && order.status !== "delivered" && (
            <section className="note-box" style={{ display: "grid", gap: 10 }}>
              <b>Try the other side</b>
              <span>This order needs a kitchen and a rider to move. Open their screens in new tabs, accept and deliver it, and watch each step land here.</span>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <a className="btn small ink" href="/vendor" target="_blank" rel="noopener">Open the kitchen</a>
                <a className="btn small ghost" href="/rider" target="_blank" rel="noopener">Open the rider screen</a>
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
          <p className="small">
            <span className="muted">Payment:</span>{" "}
            {payment?.status === "refunded" ? "Refunded" : paid ? (payment ? `Paid with Paystack at ${lagosTime(payment.paid_at)}` : "Paid") : "Not paid yet"}
          </p>
          {error && <p className="error">{error}</p>}
          {order.status === "pending" && !askCancel && (
            <button type="button" className="btn ghost full" onClick={() => setAskCancel(true)}>Cancel order</button>
          )}
          {order.status === "pending" && askCancel && (
            <div className="note-box" role="group" aria-label="Confirm cancelling" style={{ display: "grid", gap: 10 }}>
              <b>Cancel this order?</b>
              <span className="small">{paid && payment ? "You can only cancel before the kitchen accepts it. Your money goes back to you." : "You haven't paid, so nothing is charged."}</span>
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn small" onClick={cancel} disabled={cancelling}>{cancelling ? "Cancelling…" : "Yes, cancel it"}</button>
                <button type="button" className="btn small ghost" onClick={() => setAskCancel(false)} disabled={cancelling}>Keep it</button>
              </span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
