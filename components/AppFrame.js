"use client";
// The frame for the kitchen, rider and admin screens: a dark top bar with
// who is signed in, and a sign-in check for that role.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession, ROLE_LABEL } from "../lib/clientApi";
import { LogoutIcon } from "./Icons";

// Returns the session for `role`, or sends you to sign in as that role.
export function useRoleGate(role) {
  const router = useRouter();
  const path = usePathname();
  const [session, setSession] = useState(null);
  useEffect(() => {
    const check = () => {
      const s = getSession(role);
      if (!s) router.replace(`/login?as=${role}&next=${encodeURIComponent(path)}`);
      else setSession(s);
    };
    check();
    window.addEventListener("swiftplate:session", check);
    return () => window.removeEventListener("swiftplate:session", check);
  }, [role, path, router]);
  return session;
}

export default function AppFrame({ role, session, narrow = false, children }) {
  const router = useRouter();
  const signOut = () => { clearSession(role); router.replace("/login?as=" + role); };
  return (
    <div className="app">
      <header className="app-top">
        <div className={`wrap ${narrow ? "rider" : ""}`}>
          <Link href="/" className="logo" aria-label="Swiftplate customer site"><span className="logo-mark" aria-hidden="true" />swiftplate</Link>
          <span className="chip" style={{ background: "var(--yolk)" }}>{ROLE_LABEL[role]}</span>
          {session && (
            <span className="app-who">
              <b>{session.user.full_name}</b>
              <span>{session.user.email}</span>
            </span>
          )}
          <button type="button" className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out"><LogoutIcon /></button>
        </div>
      </header>
      <main id="main" className={`wrap app-main ${narrow ? "rider" : ""}`}>
        {session ? children : <p className="muted">Checking your sign-in…</p>}
      </main>
    </div>
  );
}
