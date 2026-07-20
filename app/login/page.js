"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "../../lib/clientApi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    const { ok, data } = await api("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password })
    });
    setBusy(false);
    if (!ok) return setError(data.error || "Login failed.");
    setToken(data.token);
    const role = data.user.role;
    if (role === "vendor") router.push("/vendor");
    else if (role === "admin") router.push("/admin");
    else setError(`Logged in as ${role}. The ${role} app is the mobile app (coming in Phase 4/5); this web login serves vendors and admins.`);
  };

  return (
    <div className="wrap narrow">
      <h1>Swiftplate<span>.</span></h1>
      <p className="sub">Vendor and admin sign in</p>
      <form onSubmit={submit} className="panel">
        <label className="lbl">Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="vendor@swiftplate.test" />
        <label className="lbl">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password123" />
        <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {error && <p className="bad note">{error}</p>}
        <p className="note">Demo: vendor@swiftplate.test / admin@swiftplate.test · password123</p>
      </form>
    </div>
  );
}
