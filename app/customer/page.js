"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession, api, clearSession, naira } from "../../components/useSession";

const LABEL = { pending: "Waiting for restaurant", accepted: "Accepted", preparing: "Being prepared", ready: "Ready, finding rider", rider_assigned: "Rider assigned", picked_up: "On the way to you", delivered: "Delivered", cancelled: "Cancelled" };

export default function CustomerPage() {
  const { user, loading } = useSession(["customer", "rider", "admin"]);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState({}); // menuItemId -> qty
  const [active, setActive] = useState(null);
  const [msg, setMsg] = useState("");

  const loadOrders = useCallback(async () => {
    const { data } = await api("/api/orders");
    if (data.orders) setOrders(data.orders);
  }, []);

  useEffect(() => {
    if (loading) return;
    api("/api/restaurants").then(({ data }) => {
      if (data.restaurants?.length) { setRestaurants(data.restaurants); setActive(data.restaurants[0]); }
    });
    loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, [loading, loadOrders]);

  const add = (id) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const remove = (id) => setCart(c => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });

  const total = active ? active.menu.reduce((s, m) => s + (cart[m.id] || 0) * m.price_kobo, 0) : 0;

  const order = async () => {
    const items = Object.entries(cart).map(([menu_item_id, qty]) => ({ menu_item_id, qty }));
    if (!items.length) { setMsg("Add something first."); return; }
    const { ok, data } = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({ restaurant_id: active.id, items, delivery_address: "5 Demo Close, Yaba, Lagos" })
    });
    if (ok) { setCart({}); setMsg("Order placed!"); loadOrders(); }
    else setMsg(data.error || "Could not place order.");
    setTimeout(() => setMsg(""), 2500);
  };

  if (loading) return <div className="wrap"><p>Loading…</p></div>;

  return (
    <div className="dash">
      <header className="topbar">
        <div><b>Swiftplate</b> <span className="pill cust">Customer</span></div>
        <div className="topright">
          <span className="note">{user.full_name}</span>
          <button className="alt small" onClick={() => { clearSession(); location.href = "/login"; }}>Sign out</button>
        </div>
      </header>

      <div className="wrap">
        {active && (
          <>
            <h2>{active.name}</h2>
            <p className="note">{active.description} · {active.address}</p>
            <div className="menu">
              {active.menu.map(m => (
                <div className="mrow" key={m.id}>
                  <div><b>{m.name}</b><p className="note">{m.description}</p></div>
                  <div className="mright">
                    <span>{naira(m.price_kobo)}</span>
                    {cart[m.id] ? (
                      <div className="step">
                        <button className="alt small" onClick={() => remove(m.id)}>−</button>
                        <span>{cart[m.id]}</span>
                        <button className="alt small" onClick={() => add(m.id)}>+</button>
                      </div>
                    ) : <button className="small" onClick={() => add(m.id)}>Add</button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="checkout-bar">
              <span>Total (+ ₦1,000 delivery): <b>{naira(total + (total ? 100000 : 0))}</b></span>
              <button onClick={order} disabled={!total}>Place order</button>
            </div>
            {msg && <p className="note" style={{ textAlign: "center" }}>{msg}</p>}
          </>
        )}

        <h2 style={{ marginTop: 36 }}>Your orders</h2>
        {orders.length === 0 && <p className="empty">No orders yet.</p>}
        <div className="cards">
          {orders.map(o => (
            <div className="ocard" key={o.id}>
              <div className="ocard-top">
                <span className={`status s-${o.status}`}>{LABEL[o.status] || o.status}</span>
                <b>{naira(o.total_kobo)}</b>
              </div>
              <p className="who">{o.restaurant_name}</p>
              <p className="oid">#{o.id.slice(0, 8)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
