"use client";
// RIDER SCREEN (web version of the rider app)
// Jobs that are packed and ready, and the one you're on. Taking a job is
// first come, first served: if another rider gets there first, the server
// says so and the job disappears from your list. Each step shows a tick for
// a second so you can see it went through.
import { useCallback, useEffect, useState } from "react";
import AppFrame, { useRoleGate } from "../../components/AppFrame";
import DoneFlash from "../../components/DoneFlash";
import { api } from "../../lib/clientApi";
import { lagosTime, naira, shortId } from "../../lib/food";

const NEXT = {
  rider_assigned: { action: "pickup", label: "I've picked it up", note: "Head to the kitchen and collect the order.", done: "Picked up" },
  picked_up: { action: "deliver", label: "Delivered", note: "Take it to the customer. It's already paid.", done: "Delivered" }
};

function Route({ o }) {
  return (
    <div className="route">
      <div className="stop"><i aria-hidden="true" /><span><small>Pick up</small><b>{o.restaurant_name}</b><span className="muted small" style={{ display: "block" }}>{o.restaurant_address}</span></span></div>
      <div className="stop to"><i aria-hidden="true" /><span><small>Drop off</small><b>{o.delivery_address}</b></span></div>
    </div>
  );
}

const itemsText = (o) => Array.isArray(o.items) && o.items.length ? o.items.map(i => `${i.qty}× ${i.name}`).join(", ") : "";

export default function RiderPage() {
  const session = useRoleGate("rider");
  const [mine, setMine] = useState([]);
  const [open, setOpen] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [delivered, setDelivered] = useState(0);
  const [flash, setFlash] = useState(null); // { order, label } while the tick shows

  const load = useCallback(async () => {
    const r = await api("/api/orders", { role: "rider" });
    if (!r.ok) { if (r.status !== 401) setError(r.data.error || "Couldn't load jobs."); return; }
    setMine(r.data.orders || []);
    setOpen(r.data.available || []);
  }, []);

  useEffect(() => {
    if (!session) return;
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => clearInterval(t);
  }, [session, load]);

  async function act(o, action) {
    setBusyId(o.id);
    setError("");
    const r = await api(`/api/orders/${o.id}/transition`, { role: "rider", method: "POST", body: JSON.stringify({ action }) });
    setBusyId(null);
    if (!r.ok) {
      setError(r.status === 409 && action === "claim" ? "Another rider took that job first." : (r.data.error || "That didn't go through. Try again."));
      load();
      return;
    }
    if (action === "deliver") setDelivered(n => n + 1);
    setFlash({ order: o, label: action === "claim" ? "The job is yours" : NEXT[o.status].done });
    setTimeout(() => { setFlash(null); load(); }, 1200);
  }

  // While the tick shows, keep the job in the list it was in (and only there).
  function during(list, home) {
    if (!flash) return list;
    const id = flash.order.id;
    if (!home) return list.filter(o => o.id !== id);
    return list.some(o => o.id === id) ? list.map(o => (o.id === id ? flash.order : o)) : [...list, flash.order];
  }
  const wasOpen = flash?.order.status === "ready";
  const mineShown = during(mine, flash && !wasOpen);
  const openShown = during(open, flash && wasOpen);

  return (
    <AppFrame role="rider" session={session} narrow>
      <div className="app-head">
        <div>
          <h1 className="title">Deliveries</h1>
          <p className="muted">{delivered ? `${delivered} delivered this session. Nice.` : "Take a job, pick it up, deliver it."}</p>
        </div>
      </div>
      {error && <p className="error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}

      <section aria-labelledby="mine-title" style={{ display: "grid", gap: 10, marginBottom: 26 }}>
        <h2 id="mine-title" className="h3">Your delivery</h2>
        {mineShown.length === 0 && <p className="col-empty">You're free. Take a job below.</p>}
        {mineShown.map(o => (
          <article key={o.id} className="job mine">
            {flash?.order.id === o.id && <DoneFlash label={flash.label} />}
            <div className="ticket-top"><span className="ticket-id">#{shortId(o.id)}</span><span className={`status s-${o.status}`}>{o.status === "picked_up" ? "On the way" : "Go to the kitchen"}</span></div>
            <Route o={o} />
            {itemsText(o) && <p className="small">{itemsText(o)}</p>}
            <p className="small"><b>{naira(o.total_kobo)}</b> <span className="muted">order, paid online</span></p>
            <p className="muted small">{NEXT[o.status]?.note}</p>
            {NEXT[o.status] && (
              <button type="button" className="btn" disabled={busyId === o.id || !!flash} onClick={() => act(o, NEXT[o.status].action)}>
                {busyId === o.id ? "Saving…" : NEXT[o.status].label}
              </button>
            )}
          </article>
        ))}
      </section>

      <section aria-labelledby="open-title" style={{ display: "grid", gap: 10 }}>
        <h2 id="open-title" className="h3">Ready for pickup <span className="muted" style={{ fontWeight: 500 }}>({open.length})</span></h2>
        {openShown.length === 0 && <p className="col-empty">No jobs right now. When a kitchen marks food ready, it shows up here.</p>}
        {openShown.map(o => (
          <article key={o.id} className="job">
            {flash?.order.id === o.id && <DoneFlash label={flash.label} />}
            <div className="ticket-top"><span className="ticket-id">#{shortId(o.id)}</span><span className="muted small">Ready since {lagosTime(o.updated_at || o.created_at)}</span></div>
            <Route o={o} />
            {itemsText(o) && <p className="small">{itemsText(o)}</p>}
            <button type="button" className="btn ink" disabled={busyId === o.id || !!flash} onClick={() => act(o, "claim")}>{busyId === o.id ? "Taking it…" : "Take this job"}</button>
          </article>
        ))}
      </section>
    </AppFrame>
  );
}
