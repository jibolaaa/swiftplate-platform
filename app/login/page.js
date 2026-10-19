"use client";
// One sign-in for all four roles. Each role lands on its own screen.
// ?as=vendor highlights the kitchen, ?next=/checkout comes back after.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "../../components/SiteHeader";
import { signIn, ROLE_HOME, ROLE_LABEL, DEMO_PASSWORD, DEMO_PEOPLE } from "../../lib/clientApi";

const VERB = { customer: "Orders food", vendor: "Cooks", rider: "Delivers", admin: "Sees everything" };

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const hint = DEMO_PEOPLE.some(p => p.role === params.get("as")) ? params.get("as") : null;
  const next = params.get("next") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  // Only follow ?next= to a page the signed-in role can use, and only on this site.
  const destination = (role) => {
    const local = next.startsWith("/") && !next.startsWith("//");
    const fits = role === "customer" ? !["/vendor", "/rider", "/admin"].some(a => next.startsWith(a)) : next.startsWith(ROLE_HOME[role]);
    return local && fits ? next : ROLE_HOME[role];
  };

  async function go(mail, pass, who) {
    if (busy) return;
    if (!mail.includes("@")) { setError("Type the email address, like customer@swiftplate.test."); return; }
    setBusy(who);
    setError("");
    const r = await signIn(mail, pass);
    if (!r.ok) { setBusy(null); setError(r.data.error === "Invalid email or password." ? "That email and password don't match an account." : (r.data.error || "Couldn't sign in. Try again.")); return; }
    router.replace(destination(r.data.user.role));
  }

  const people = hint ? [...DEMO_PEOPLE].sort((a, b) => (b.role === hint) - (a.role === hint)) : DEMO_PEOPLE;

  return (
    <main id="main" className="gate">
      <div className="gate-box">
        <Logo />
        <div style={{ display: "grid", gap: 8 }}>
          <h1 className="title">{hint && hint !== "customer" ? `${ROLE_LABEL[hint]} sign-in` : "Sign in"}</h1>
          <p className="muted">One account works for its own role: customers order, kitchens cook, riders deliver, admins see everything.</p>
        </div>

        <div className="demo">
          <p className="small"><b>Trying the demo?</b> Tap a person to sign in as them. You can be all four at once, one per tab.</p>
          {people.map(p => (
            <button key={p.role} type="button" className={`demo-person ${p.role === hint ? "hint" : ""}`} disabled={!!busy} onClick={() => go(p.email, DEMO_PASSWORD, p.role)}>
              <i aria-hidden="true">{p.icon}</i>
              <span><b>{p.name}, {ROLE_LABEL[p.role].toLowerCase()}</b><small>{p.email}</small></span>
              <em>{busy === p.role ? "Signing in…" : VERB[p.role]}</em>
            </button>
          ))}
        </div>

        <form className="card" onSubmit={(e) => { e.preventDefault(); go(email, password, "form"); }} noValidate>
          <h2>Or sign in with email</h2>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="btn full" disabled={!!busy}>{busy === "form" ? "Signing in…" : "Sign in"}</button>
          <p className="muted small">Demo accounts use the password {DEMO_PASSWORD}.</p>
        </form>
        <Link href="/" className="link small" style={{ justifySelf: "start" }}>Back to Swiftplate</Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><SignIn /></Suspense>;
}
