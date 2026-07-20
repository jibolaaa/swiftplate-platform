"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession, api, clearSession, naira } from "../../components/useSession";

const NEXT = { pending: ["accept", "Accept order"], accepted: ["preparing", "Start preparing"], preparing: ["ready", "Mark ready"] };
const LABEL = { pending: "New", accepted: "Accepted", preparing: "Preparing", ready: "Ready for pickup", rider_assigned: "Rider assigned", picked_up: "On the way", delivered: "Delivered", cancelled: "Cancelled" };

export default function VendorDashboard() {
  const { user, loading } = useSession(["vendor", "admin"]);
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api("/api/orders");
    if (data.orders) setOrders(data.orders);
  }, []);

  useEffect(() => {
    if (loading) return;
    load();
    const t = setInterval(load, 5000); // poll every 5s (real-time comes in Phase 5)
    return () => clearInterval(t);
  }, [loading, load]);

  const act = async (id, action) => {
    setBusy(id + action);
    await api(`/api/orders/${id}/transition`, { method: "POST", body: JSON.stringify({ action }) });
    await load();
    setBusy(null);
  };

  if (loading) return <div className="wrap"><p>Loading…</p></div>;

  const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const done = orders.filter(o => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="dash">
      <header className="topbar">
        <div><b>Swiftplate</b> <span className="pill">Vendor</span></div>
        <div className="topright">
          <span className="note">{user.full_name}</span>
          <button className="alt small" onClick={() => { clearSession(); location.href = "/login"; }}>Sign out</button>
        </div>
      </header>

      <div className="wrap">
        <h2>Incoming orders <span className="count">{active.length} active</span></h2>
        {active.length === 0 && <p className="empty">No active orders. New orders appear here automatically.</p>}
        <div className="cards">
          {active.map(o => (
            <div className="ocard" key={o.id}>
              <div className="ocard-top">
                <span className={`status s-${o.status}`}>{LABEL[o.status] || o.status}</span>
                <b>{naira(o.total_kobo)}</b>
              </div>
              <p className="who">{o.customer_name}</p>
              <p className="addr">{o.delivery_address}</p>
              <p className="oid">#{o.id.slice(0, 8)}</p>
              {NEXT[o.status] && (
                <button disabled={busy === o.id + NEXT[o.status][0]} onClick={() => act(o.id, NEXT[o.status][0])}>
                  {busy === o.id + NEXT[o.status][0] ? "…" : NEXT[o.status][1]}
                </button>
              )}
              {o.status === "ready" && <p className="note">Waiting for a rider to claim.</p>}
              {["rider_assigned", "picked_up"].includes(o.status) && <p className="note">Rider handling delivery.</p>}
            </div>
          ))}
        </div>

        {done.length > 0 && <>
          <h2 style={{ marginTop: 40 }}>Completed</h2>
          <div className="cards">
            {done.map(o => (
              <div className="ocard muted" key={o.id}>
                <div className="ocard-top">
                  <span className={`status s-${o.status}`}>{LABEL[o.status]}</span>
                  <b>{naira(o.total_kobo)}</b>
                </div>
                <p className="who">{o.customer_name}</p>
                <p className="oid">#{o.id.slice(0, 8)}</p>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
}
