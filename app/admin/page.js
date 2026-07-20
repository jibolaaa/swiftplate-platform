"use client";
// ADMIN DASHBOARD: bird's-eye view. Stats cards + every order in the
// system with who handled it. Same 5s polling heartbeat.
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, naira, STATUS_LABEL } from "../../lib/clientApi";

export default function AdminDashboard() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { ok, status, data } = await api("/api/admin/orders");
    if (!ok) {
      if (status === 401 || status === 403) return router.push("/login");
      return setError(data.error || "Failed to load.");
    }
    setStats(data.stats); setOrders(data.orders);
  }, [router]);

  useEffect(() => {
    (async () => {
      const { ok, data } = await api("/api/auth/me");
      if (!ok || data.role !== "admin") return router.push("/login");
      setMe(data);
      load();
    })();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load, router]);

  return (
    <div className="wrap wide">
      <div className="dash-head">
        <div>
          <h1>Admin<span>.</span></h1>
          <p className="sub">{me ? `${me.name} · everything, refreshed every 5s` : "Loading…"}</p>
        </div>
        <button className="alt" onClick={() => { setToken(null); router.push("/login"); }}>Sign out</button>
      </div>
      {error && <p className="bad note">{error}</p>}

      {stats && (
        <div className="stat-row">
          <div className="stat-card"><b>{stats.total_orders}</b><span>Total orders</span></div>
          <div className="stat-card"><b>{stats.delivered}</b><span>Delivered</span></div>
          <div className="stat-card"><b>{naira(stats.revenue_kobo)}</b><span>Revenue (delivered)</span></div>
        </div>
      )}

      <div className="panel">
        <h2>All orders</h2>
        <div className="tbl">
          <div className="tr th">
            <span>Order</span><span>Status</span><span>Restaurant</span><span>Customer</span><span>Rider</span><span>Total</span>
          </div>
          {orders.map(o => (
            <div className="tr" key={o.id}>
              <span className="dim">#{o.id.slice(0, 8)}</span>
              <span><span className={`status s-${o.status}`}>{STATUS_LABEL[o.status]}</span></span>
              <span>{o.restaurant}</span>
              <span>{o.customer}</span>
              <span>{o.rider || "—"}</span>
              <span><b>{naira(o.total_kobo)}</b></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
