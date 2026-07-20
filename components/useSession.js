"use client";
import { useEffect, useState } from "react";

export function saveSession(token, user) {
  localStorage.setItem("sp_token", token);
  localStorage.setItem("sp_user", JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem("sp_token");
  localStorage.removeItem("sp_user");
}
export function getToken() {
  try { return localStorage.getItem("sp_token"); } catch { return null; }
}

// Hook: returns { user, token, loading }. Redirects to /login if no
// session, or if the role is not in `allow`.
export function useSession(allow = null) {
  const [state, setState] = useState({ user: null, token: null, loading: true });
  useEffect(() => {
    const token = getToken();
    let user = null;
    try { user = JSON.parse(localStorage.getItem("sp_user")); } catch {}
    if (!token || !user) { window.location.href = "/login"; return; }
    if (allow && !allow.includes(user.role)) { window.location.href = "/login?wrong=1"; return; }
    setState({ user, token, loading: false });
  }, []);
  return state;
}

// fetch wrapper that attaches the token
export async function api(path, opts = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const naira = (kobo) => "\u20A6" + (Number(kobo) / 100).toLocaleString("en-NG");
