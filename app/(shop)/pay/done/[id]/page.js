"use client";
// Where Paystack sends you after paying. We check with Paystack (through
// our server) that the money arrived before telling you it did. If you
// paid from the phone app, this page opens in its browser: close it and
// the app picks up the payment by itself.
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession } from "../../../../../lib/clientApi";
import { CheckIcon } from "../../../../../components/Icons";

export default function PayDone({ params }) {
  const [state, setState] = useState({ step: "checking" });

  async function check() {
    setState({ step: "checking" });
    let reference = null;
    try {
      const q = new URLSearchParams(window.location.search);
      reference = q.get("reference") || q.get("trxref");
    } catch {}
    if (!reference) { setState({ step: "none" }); return; }
    let r, data = {};
    try {
      r = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) });
      data = await r.json().catch(() => ({}));
    } catch {
      setState({ step: "error", error: "Couldn't reach Swiftplate to check. Try again." });
      return;
    }
    if (!r.ok) { setState({ step: "error", error: data.error || "Couldn't check the payment." }); return; }
    if (data.paid) {
      const onWeb = Boolean(getSession("customer"));
      setState({ step: "paid", onWeb });
      if (onWeb) setTimeout(() => window.location.replace(`/orders/${params.id}`), 2200);
    } else {
      setState({ step: "unpaid", payState: data.state });
    }
  }

  useEffect(() => { check(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="wrap page">
      <div className="pay-done card">
        {state.step === "checking" && (
          <>
            <span className="spin" aria-hidden="true" />
            <h1 className="title">Checking your payment…</h1>
            <p className="muted">We're asking Paystack whether the money arrived.</p>
          </>
        )}
        {state.step === "paid" && (
          <>
            <span className="tick-big" aria-hidden="true"><CheckIcon /></span>
            <h1 className="title">Payment received</h1>
            <p className="muted">Your order has gone to the kitchen.</p>
            {state.onWeb ? (
              <>
                <p className="small muted">Taking you to your order…</p>
                <Link href={`/orders/${params.id}`} className="btn">Follow your order</Link>
              </>
            ) : (
              <p className="note-box">Paid in the Swiftplate app? Close this page and go back to the app. It updates by itself.</p>
            )}
          </>
        )}
        {state.step === "unpaid" && (
          <>
            <h1 className="title">We haven't got your payment yet</h1>
            <p className="muted">{state.payState === "abandoned" ? "The payment wasn't finished." : "If you paid by bank transfer it can take a minute to arrive."}</p>
            <button type="button" className="btn" onClick={check}>Check again</button>
            <Link href={`/orders/${params.id}`} className="btn ghost">Back to your order</Link>
          </>
        )}
        {state.step === "none" && (
          <>
            <h1 className="title">No payment to check</h1>
            <Link href={`/orders/${params.id}`} className="btn">Go to your order</Link>
          </>
        )}
        {state.step === "error" && (
          <>
            <p className="error">{state.error}</p>
            <button type="button" className="btn" onClick={check}>Try again</button>
          </>
        )}
      </div>
    </div>
  );
}
