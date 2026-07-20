"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession, api, clearSession, naira } from "../../components/useSession";

const LABEL = { pending: "New", accepted: "Accepted", preparing: "Preparing", ready: "Ready", rider_assigned: "Assigned", picked_up: "On the way", delivered: "Delivered", cancelled: "Cancelled" };

export default function AdminDashboard() {
  const { user, loading } = useSession(["admin"]);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    const { data } = await api("/api/admin/orders");
    if (data.stats) { setStats(data.stats); setOrders(data.orders); }
  }, []);

  useEffect(() => {
    if (loading) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [loading, load]);

  if (loading) return <div className="wrap"><p>Loading…</p></div>;

  return (
    <div className="dash">
      <header className="topbar">
        <div><b>Swiftplate</b> <span className="pill admin">Admin</span></div>
        <div className="topright">
          <span className="note">{user.full_name}</span>
          <button className="alt small" onClick={() => { clearSession(); location.href = "/login"; }}>Sign out</button>
        </div>
      </header>

      <div className="wrap">
        <div className="stats">
          <div className="stat"><span>Total orders</span><b>{stats?.total_orders ?? "…"}</b></div>
          <div className="stat"><span>Delivered</span><b>{stats?.delivered ?? "…"}</b></div>
          <div className="stat"><span>Revenue</span><b>{stats ? naira(stats.revenue_kobo) : "…"}</b></div>
        </div>

        <h2>All orders</h2>
        <div className="table">
          <div className="tr th">
            <span>Order</span><span>Restaurant</span><span>Customer</span><span>Rider</span><span>Status</span><span>Total</span>
          </div>
          {orders.map(o => (
            <div className="tr" key={o.id}>
              <span className="mono">#{o.id.slice(0, 8)}</span>
              <span>{o.restaurant}</span>
              <span>{o.customer}</span>
              <span>{o.rider || "—"}</span>
              <span><i className={`status s-${o.status}`}>{LABEL[o.status] || o.status}</i></span>
              <span>{naira(o.total_kobo)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
