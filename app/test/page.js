"use client";
// ===== PHONE TEST CONSOLE =====
// Tap-button testing so the whole backend can be verified from a
// phone: no curl, no Postman. Every button calls a real API route
// and prints the raw JSON response below.
import { useState } from "react";

export default function TestConsole() {
  const [out, setOut] = useState("Responses will appear here…");
  const [token, setToken] = useState(null);
  const [who, setWho] = useState(null);
  const [seedSecret, setSeedSecret] = useState("");

  const show = (label, data) =>
    setOut(`▶ ${label}\n` + JSON.stringify(data, null, 2));

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
      method: "POST",
      body: JSON.stringify({ email, password: "password123" })
    });
    if (data?.token) { setToken(data.token); setWho(data.user); }
  };

  return (
    <div className="wrap">
      <h1>Test console<span>.</span></h1>
      <p className="sub">Tap buttons, read responses. This is the whole backend, testable from your phone.</p>

      <div className="panel">
        <h2>1 · Health check</h2>
        <button onClick={() => call("Health", "/api/health")}>Check API + database</button>
      </div>

      <div className="panel">
        <h2>2 · Seed demo data</h2>
        <p className="note">Creates one user per role (password: password123), a restaurant and menu. Needs your SEED_SECRET.</p>
        <input placeholder="Seed secret" value={seedSecret} onChange={e => setSeedSecret(e.target.value)} />
        <button onClick={() => call("Seed", "/api/dev/seed", { method: "POST", body: JSON.stringify({ secret: seedSecret }) })}>
          Seed demo data
        </button>
      </div>

      <div className="panel">
        <h2>3 · Log in as each role</h2>
        <p className="note">{who ? <>Logged in: <b>{who.full_name}</b> ({who.role})</> : "Not logged in yet."}</p>
        <button onClick={() => login("customer@swiftplate.test")}>Customer</button>
        <button onClick={() => login("vendor@swiftplate.test")}>Vendor</button>
        <button onClick={() => login("rider@swiftplate.test")}>Rider</button>
        <button onClick={() => login("admin@swiftplate.test")}>Admin</button>
      </div>

      <div className="panel">
        <h2>4 · RBAC in action</h2>
        <p className="note">"Who am I" works for any logged-in role. The admin-only check should FAIL unless you logged in as admin: that failure is RBAC working.</p>
        <button className="alt" onClick={() => call("Who am I", "/api/auth/me")}>Who am I?</button>
        <button className="alt" onClick={() => call("Admin-only check", "/api/admin/ping")}>Try admin-only endpoint</button>
      </div>

      <pre>{out}</pre>
    </div>
  );
}
