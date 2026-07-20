"use client";
// VENDOR DASHBOARD
// Shows the restaurant's order queue, newest first, refreshing every
// 5 seconds (polling; Phase 5 upgrades this to instant WebSockets).
// Each order card shows exactly the action its current state allows:
// the UI mirrors the state machine on the server.
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, naira, STATUS_LABEL } from "../../lib/clientApi";

const NEXT_ACTION = {
  pending:   { action: "accept",    label: "Accept order" },
  accepted:  { action: "preparing", label: "Start preparing" },
  preparing: { action: "ready",     label: "Mark ready" }
};

export default function VendorDashboard() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const { ok, status, data } = await api("/api/orders");
    if (!ok) {
      if (status === 401 || status === 403) return router.push("/login");
      return setError(data.error || "Failed to load orders.");
    }
    setOrders(data.orders || []);
  }, [router]);

  useEffect(() => {
    (async () => {
      const { ok, data } = await api("/api/auth/me");
      if (!ok || data.role !== "vendor") return router.push("/login");
      setMe(data);
      load();
    })();
    const t = setInterval(load, 5000); // the 5s heartbeat
    return () => clearInterval(t);
  }, [load, router]);

  const act = async (id, action) => {
    setBusyId(id);
    const { ok, data } = await api(`/api/orders/${id}/transition`, {
      method: "POST", body: JSON.stringify({ action })
    });
    setBusyId(null);
    if (!ok) return setError(data.error || "Action failed.");
    setError("");
    load();
  };

  const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const past = orders.filter(o => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="wrap">
      <div className="dash-head">
        <div>
          <h1>Vendor<span>.</span></h1>
          <p className="sub">{me ? `${me.name} · order queue refreshes every 5s` : "Loading…"}</p>
        </div>
        <button className="alt" onClick={() => { setToken(null); router.push("/login"); }}>Sign out</button>
      </div>
      {error && <p className="bad note">{error}</p>}

      <div className="panel">
        <h2>Active orders ({active.length})</h2>
        {active.length === 0 && <p className="note">No active orders. New ones appear here automatically.</p>}
        {active.map(o => (
          <div className="order-card" key={o.id}>
            <div className="order-top">
              <span className={`status s-${o.status}`}>{STATUS_LABEL[o.status]}</span>
              <b>{naira(o.total_kobo)}</b>
            </div>
            <p className="note">{o.customer_name} · {o.delivery_address}</p>
            <p className="note dim">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleTimeString()}</p>
            {NEXT_ACTION[o.status] && (
              <button disabled={busyId === o.id} onClick={() => act(o.id, NEXT_ACTION[o.status].action)}>
                {busyId === o.id ? "Working…" : NEXT_ACTION[o.status].label}
              </button>
            )}
            {["ready", "rider_assigned", "picked_up"].includes(o.status) && !NEXT_ACTION[o.status] && (
              <p className="note">Waiting on rider…</p>
            )}
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>Completed ({past.length})</h2>
        {past.slice(0, 6).map(o => (
          <div className="order-card past" key={o.id}>
            <div className="order-top">
              <span className={`status s-${o.status}`}>{STATUS_LABEL[o.status]}</span>
              <b>{naira(o.total_kobo)}</b>
            </div>
            <p className="note dim">#{o.id.slice(0, 8)} · {o.customer_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
