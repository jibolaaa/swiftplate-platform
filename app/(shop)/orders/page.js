"use client";
// Your orders, newest first. Each one opens its live tracking page.
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getSession } from "../../../lib/clientApi";
import { STATUS_LABEL, lagosWhen, naira, shortId } from "../../../lib/food";

export default function OrdersPage() {
  const [state, setState] = useState({ step: "loading", orders: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getSession("customer")) { setState({ step: "signed-out", orders: [] }); return; }
      const r = await api("/api/orders", { role: "customer" });
      if (!alive) return;
      if (r.status === 401) setState({ step: "signed-out", orders: [] });
      else if (!r.ok) setState({ step: "error", error: r.data.error, orders: [] });
      else setState({ step: "ready", orders: r.data.orders || [] });
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="wrap page">
      <div className="page-head"><h1 className="title">Your orders</h1></div>
      {state.step === "loading" && <p className="muted">Loading…</p>}
      {state.step === "signed-out" && (
        <div className="empty">
          <p>Sign in to see your orders.</p>
          <Link href="/login?as=customer&next=/orders" className="btn">Sign in</Link>
        </div>
      )}
      {state.step === "error" && <p className="error">{state.error || "Couldn't load your orders."}</p>}
      {state.step === "ready" && state.orders.length === 0 && (
        <div className="empty">
          <p className="muted">No orders yet.</p>
          <Link href="/kitchens" className="btn">Find something to eat</Link>
        </div>
      )}
      {state.orders.length > 0 && (
        <ul className="olist">
          {state.orders.map(o => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="orow">
                <span>
                  <b>{o.restaurant_name}</b>
                  <span className="meta" style={{ display: "block" }}>#{shortId(o.id)} · {lagosWhen(o.created_at)}</span>
                </span>
                <span style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                  <b className="price" style={{ fontSize: 16 }}>{naira(o.total_kobo)}</b>
                  {["initiated", "failed"].includes(o.payment_status) && o.status !== "cancelled"
                    ? <span className="status s-unpaid">Waiting for payment</span>
                    : <span className={`status s-${o.status}`}>{o.status === "pending" ? "Paid" : STATUS_LABEL[o.status] || o.status}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
