"use client";
// ===== PHONE TEST CONSOLE v2 =====
// Phase 1: health, seed, login, RBAC.
// Phase 2: play a full order through the state machine by switching
// roles: customer places -> vendor accepts/prepares/ready ->
// rider claims/picks up/delivers -> admin sees everything.
import { useState } from "react";

export default function TestConsole() {
  const [out, setOut] = useState("Responses will appear here…");
  const [token, setToken] = useState(null);
  const [who, setWho] = useState(null);
  const [seedSecret, setSeedSecret] = useState("");
  const [restaurant, setRestaurant] = useState(null);
  const [orderId, setOrderId] = useState(null);

  const show = (label, data) => setOut(`▶ ${label}\n` + JSON.stringify(data, null, 2));

  const call = async (label, path, opts = {}) => {
    try {
      const res = await fetch(path, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(opts.headers || {})
        }
      });
      const data = await res.json();
      show(`${label} → HTTP ${res.status}`, data);
      return data;
    } catch (e) {
      show(`${label} → network error`, { error: e.message });
    }
  };

  const login = async (email) => {
    const data = await call(`Login as ${email}`, "/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password: "password123" })
    });
    if (data?.token) { setToken(data.token); setWho(data.user); }
  };

  const browse = async () => {
    const data = await call("Browse restaurants", "/api/restaurants");
    if (data?.restaurants?.length) setRestaurant(data.restaurants[0]);
  };

  const placeOrder = async () => {
    if (!restaurant) return show("Place order", { error: "Browse restaurants first so I know the menu." });
    const items = restaurant.menu.slice(0, 2).map(m => ({ menu_item_id: m.id, qty: 1 }));
    const data = await call("Place order (customer)", "/api/orders", {
      method: "POST",
      body: JSON.stringify({ restaurant_id: restaurant.id, items, delivery_address: "5 Demo Close, Yaba, Lagos" })
    });
    if (data?.order?.id) setOrderId(data.order.id);
  };

  const transition = (action) => {
    if (!orderId) return show(action, { error: "No current order. Place one first." });
    return call(`Transition: ${action} (as ${who?.role || "?"})`, `/api/orders/${orderId}/transition`, {
      method: "POST", body: JSON.stringify({ action })
    });
  };

  const roleBtn = (email, label) => (
    <button onClick={() => login(email)} className={who?.email === email ? "" : "alt"}>{label}</button>
  );

  return (
    <div className="wrap">
      <h1>Test console<span>.</span></h1>
      <p className="sub">
        {who ? <>Logged in: <b>{who.full_name}</b> · role: <b>{who.role}</b></> : "Not logged in."}
        {orderId && <> · current order: <b>{orderId.slice(0, 8)}…</b></>}
      </p>

      <div className="panel">
        <h2>Setup</h2>
        <button className="alt" onClick={() => call("Health", "/api/health")}>Health check</button>
        <input placeholder="Seed secret" value={seedSecret} onChange={e => setSeedSecret(e.target.value)} />
        <button className="alt" onClick={() => call("Seed", "/api/dev/seed", { method: "POST", body: JSON.stringify({ secret: seedSecret }) })}>Seed demo data</button>
      </div>

      <div className="panel">
        <h2>Switch role</h2>
        {roleBtn("customer@swiftplate.test", "Customer")}
        {roleBtn("vendor@swiftplate.test", "Vendor")}
        {roleBtn("rider@swiftplate.test", "Rider")}
        {roleBtn("admin@swiftplate.test", "Admin")}
      </div>

      <div className="panel">
        <h2>The order lifecycle · follow the numbers</h2>
        <p className="note">Each step needs the RIGHT role logged in. Doing a step with the wrong role should fail: that failure is RBAC.</p>
        <p className="note"><b>As customer:</b></p>
        <button onClick={browse}>1 · Browse restaurants</button>
        <button onClick={placeOrder}>2 · Place order</button>
        <p className="note"><b>As vendor:</b></p>
        <button onClick={() => transition("accept")}>3 · Accept</button>
        <button onClick={() => transition("preparing")}>4 · Preparing</button>
        <button onClick={() => transition("ready")}>5 · Ready</button>
        <p className="note"><b>As rider:</b></p>
        <button onClick={() => transition("claim")}>6 · Claim</button>
        <button onClick={() => transition("pickup")}>7 · Pick up</button>
        <button onClick={() => transition("deliver")}>8 · Deliver</button>
      </div>

      <div className="panel">
        <h2>Views per role</h2>
        <button className="alt" onClick={() => call("My orders (role-scoped)", "/api/orders")}>My orders</button>
        <button className="alt" onClick={() => orderId ? call("Order detail + timeline", `/api/orders/${orderId}`) : show("Detail", { error: "No current order." })}>Order timeline</button>
        <button className="alt" onClick={() => call("Admin overview", "/api/admin/orders")}>Admin: all orders + revenue</button>
      </div>

      <pre>{out}</pre>
    </div>
  );
}
