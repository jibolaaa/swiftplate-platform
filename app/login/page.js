"use client";
import { Suspense, useState } from "react";
import { saveSession } from "../../components/useSession";

const DEMO = [
  ["customer@swiftplate.test", "Customer"],
  ["vendor@swiftplate.test", "Vendor"],
  ["rider@swiftplate.test", "Rider"],
  ["admin@swiftplate.test", "Admin"]
];
const HOME = { customer: "/customer", vendor: "/vendor", rider: "/customer", admin: "/admin" };

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      saveSession(data.token, data.user);
      window.location.href = HOME[data.user.role] || "/";
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const quick = (e) => { setEmail(e); setPassword("password123"); };

  return (
    <div className="auth">
      <div className="auth-card">
        <h1>Swiftplate<span>.</span></h1>
        <p className="sub">Sign in to your dashboard</p>
        <form onSubmit={submit}>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          {error && <p className="bad" style={{ marginTop: 10 }}>{error}</p>}
        </form>
        <p className="note" style={{ marginTop: 18 }}>Demo accounts (tap to fill, password is preset):</p>
        <div className="demo-row">
          {DEMO.map(([e, label]) => (
            <button type="button" key={e} className="alt small" onClick={() => quick(e)}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
