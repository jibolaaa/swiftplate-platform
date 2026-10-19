"use client";
// Sessions in the browser: one per role, so you can be signed in as the
// customer, the kitchen, the rider and the admin at the same time and
// hop between their screens (handy for the demo). The token decides
// nothing by itself: the API checks the role inside it on every request.

export { ROLES, ROLE_LABEL, ROLE_HOME, DEMO_PASSWORD, DEMO_PEOPLE } from "./roles";

const KEY = (role) => `swiftplate_${role}`;
const changed = () => { try { window.dispatchEvent(new Event("swiftplate:session")); } catch {} };

export function getSession(role) {
  try {
    const s = JSON.parse(localStorage.getItem(KEY(role)));
    return s && s.token && s.user?.role === role ? s : null;
  } catch { return null; }
}
export function saveSession(token, user) {
  try { localStorage.setItem(KEY(user.role), JSON.stringify({ token, user })); } catch {}
  changed();
}
export function clearSession(role) {
  try { localStorage.removeItem(KEY(role)); } catch {}
  changed();
}

// fetch with the right role's token. Never throws: returns { ok, status, data }.
export async function api(path, { role, ...opts } = {}) {
  const token = role ? getSession(role)?.token : null;
  let res;
  try {
    res = await fetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {})
      }
    });
  } catch {
    return { ok: false, status: 0, data: { error: "Couldn't reach Swiftplate. Check your connection and try again." } };
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && role) clearSession(role); // expired or invalid: sign in again
  return { ok: res.ok, status: res.status, data };
}

export async function signIn(email, password) {
  const r = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: String(email).trim(), password }) });
  if (r.ok) saveSession(r.data.token, r.data.user);
  return r;
}
