"use client";
// ADMIN SCREEN: every order on the platform, who handled it, and the money.
// Same 5 second check as the other screens.
import { useCallback, useEffect, useState } from "react";
import AppFrame, { useRoleGate } from "../../components/AppFrame";
import { api } from "../../lib/clientApi";
import { STATUS_LABEL, lagosTime, naira, shortId } from "../../lib/food";

const FILTERS = [
  ["all", "All", () => true],
  ["active", "In progress", o => !["delivered", "cancelled"].includes(o.status)],
  ["delivered", "Delivered", o => o.status === "delivered"],
  ["cancelled", "Cancelled", o => o.status === "cancelled"]
];

export default function AdminPage() {
  const session = useRoleGate("admin");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [show, setShow] = useState("all");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api("/api/admin/orders", { role: "admin" });
    if (!r.ok) { if (r.status !== 401) setError(r.data.error || "Couldn't load orders."); return; }
    setStats(r.data.stats);
    setOrders(r.data.orders || []);
    setError("");
  }, []);

  useEffect(() => {
    if (!session) return;
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => clearInterval(t);
  }, [session, load]);

  const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;
  const test = FILTERS.find(f => f[0] === show)[2];
  const shown = orders.filter(test);

  return (
    <AppFrame role="admin" session={session}>
      <div className="app-head">
        <div>
          <h1 className="title">Overview</h1>
          <p className="muted">Every order on Swiftplate, newest first.</p>
        </div>
        <span className="live">Live, checks every 5 seconds</span>
      </div>
      {error && <p className="error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
      <div className="stats">
        <div className="stat hot"><span>Revenue (delivered)</span><b>{stats ? naira(stats.revenue_kobo) : "…"}</b></div>
        <div className="stat"><span>Orders</span><b>{stats?.total_orders ?? "…"}</b></div>
        <div className="stat"><span>Delivered</span><b>{stats?.delivered ?? "…"}</b></div>
        <div className="stat"><span>In progress now</span><b>{stats ? active : "…"}</b></div>
      </div>
      <div className="filters" role="group" aria-label="Show">
        {FILTERS.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={show === key} onClick={() => setShow(key)}>{label}</button>
        ))}
      </div>
      {shown.length === 0 ? <p className="col-empty">No orders here yet.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Status</th><th>Kitchen</th><th>Customer</th><th>Rider</th><th>Time</th><th className="num">Total</th></tr></thead>
            <tbody>
              {shown.map(o => (
                <tr key={o.id}>
                  <td><b>#{shortId(o.id)}</b></td>
                  <td><span className={`status s-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                  <td>{o.restaurant}</td>
                  <td className="hide-sm">{o.customer}</td>
                  <td className="hide-sm">{o.rider || <span className="muted">None yet</span>}</td>
                  <td className="muted">{lagosTime(o.created_at)}</td>
                  <td className="num"><b>{naira(o.total_kobo)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppFrame>
  );
}
