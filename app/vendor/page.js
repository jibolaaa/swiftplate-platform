"use client";
// KITCHEN SCREEN
// The kitchen's orders as a board: new, cooking, waiting for a rider, done.
// It checks for changes every 5 seconds. Each ticket only offers the next
// step the server's state machine allows, so the screen can't skip one.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AppFrame, { useRoleGate } from "../../components/AppFrame";
import { api } from "../../lib/clientApi";
import { STATUS_LABEL, lagosTime, naira, shortId } from "../../lib/food";

const NEXT = {
  pending: { action: "accept", label: "Accept order" },
  accepted: { action: "preparing", label: "Start cooking" },
  preparing: { action: "ready", label: "Food is ready" }
};
const COLUMNS = [
  { key: "new", title: "New", match: ["pending"], empty: "No new orders. They pop up here by themselves." },
  { key: "cooking", title: "Cooking", match: ["accepted", "preparing"], empty: "Nothing on the stove." },
  { key: "waiting", title: "Waiting for a rider", match: ["ready", "rider_assigned"], empty: "Nothing waiting." },
  { key: "done", title: "Done", match: ["picked_up", "delivered", "cancelled"], empty: "Finished orders show here." }
];

export default function KitchenPage() {
  const session = useRoleGate("vendor");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [fresh, setFresh] = useState(new Set());
  const seen = useRef(null);

  const load = useCallback(async () => {
    const r = await api("/api/orders", { role: "vendor" });
    if (!r.ok) { if (r.status !== 401) setError(r.data.error || "Couldn't load orders."); return; }
    const list = r.data.orders || [];
    if (seen.current) {
      const arrivals = list.filter(o => o.status === "pending" && !seen.current.has(o.id)).map(o => o.id);
      if (arrivals.length) setFresh(f => new Set([...f, ...arrivals]));
    }
    seen.current = new Set(list.map(o => o.id));
    setOrders(list);
    setError("");
  }, []);

  useEffect(() => {
    if (!session) return;
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => clearInterval(t);
  }, [session, load]);

  const newCount = orders.filter(o => o.status === "pending").length;
  useEffect(() => { document.title = newCount ? `(${newCount}) New orders | Swiftplate Kitchen` : "Kitchen | Swiftplate"; }, [newCount]);

  async function act(o) {
    const step = NEXT[o.status];
    setBusyId(o.id);
    const r = await api(`/api/orders/${o.id}/transition`, { role: "vendor", method: "POST", body: JSON.stringify({ action: step.action }) });
    setBusyId(null);
    if (!r.ok) setError(r.data.error || "That didn't go through. Try again.");
    setFresh(f => { const n = new Set(f); n.delete(o.id); return n; });
    load();
  }

  return (
    <AppFrame role="vendor" session={session}>
      <div className="app-head">
        <div>
          <h1 className="title">Kitchen orders</h1>
          <p className="muted">{orders.length ? `${orders.length} recent ${orders.length === 1 ? "order" : "orders"}.` : "No orders yet."} <Link href="/" className="link" target="_blank">Place a test order</Link></p>
        </div>
        <span className="live">Live, checks every 5 seconds</span>
      </div>
      {error && <p className="error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
      <div className="board">
        {COLUMNS.map(col => {
          const list = orders.filter(o => col.match.includes(o.status));
          const shown = col.key === "done" ? list.slice(0, 8) : list;
          return (
            <section key={col.key} className={`col ${col.key}`} aria-label={col.title}>
              <h2 className="col-head"><span>{col.title}</span><span className="n">{list.length}</span></h2>
              {shown.length === 0 && <p className="col-empty">{col.empty}</p>}
              {col.key === "done" ? (
                <div className="done-list">
                  {shown.map(o => (
                    <div key={o.id} className="done-row">
                      <span>#{shortId(o.id)} · {o.customer_name}</span>
                      <span className={`status s-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                    </div>
                  ))}
                </div>
              ) : shown.map(o => (
                <article key={o.id} className={`ticket ${fresh.has(o.id) ? "fresh" : ""}`}>
                  <div className="ticket-top">
                    <span className="ticket-id">#{shortId(o.id)}</span>
                    <span className={`status s-${o.status}`}>{fresh.has(o.id) ? "Just in" : STATUS_LABEL[o.status]}</span>
                  </div>
                  {Array.isArray(o.items) && o.items.length > 0 && (
                    <ul>{o.items.map((it, i) => <li key={i}><b>{it.qty}×</b><span>{it.name}</span></li>)}</ul>
                  )}
                  <div className="ticket-meta">
                    <span>{o.customer_name} · {lagosTime(o.created_at)} · {naira(o.total_kobo)}</span>
                    <span>To {o.delivery_address}</span>
                    {o.status === "rider_assigned" && <span><b>{o.rider_name || "A rider"}</b> is coming to pick it up</span>}
                    {o.status === "ready" && <span>Packed. Finding a rider…</span>}
                  </div>
                  {NEXT[o.status] && (
                    <button type="button" className={`btn ${o.status === "pending" ? "" : "ink"}`} disabled={busyId === o.id} onClick={() => act(o)}>
                      {busyId === o.id ? "Saving…" : NEXT[o.status].label}
                    </button>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </AppFrame>
  );
}
