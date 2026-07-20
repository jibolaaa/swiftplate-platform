"use client";
// Client helpers for the dashboards.
// Token lives in localStorage; every API call attaches it.
export const getToken = () => {
  try { return localStorage.getItem("swiftplate_token"); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem("swiftplate_token", t) : localStorage.removeItem("swiftplate_token"); } catch {}
};

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(opts.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const naira = (kobo) =>
  "\u20A6" + (Number(kobo) / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const STATUS_LABEL = {
  pending: "New order", accepted: "Accepted", preparing: "Preparing",
  ready: "Ready for pickup", rider_assigned: "Rider on the way",
  picked_up: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled"
};
