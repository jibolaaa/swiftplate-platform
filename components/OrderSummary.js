"use client";
// What's in the order so far, with − and + for each dish, and the totals.
// Shown beside a kitchen's menu on big screens, and on the checkout page.
import Link from "next/link";
import { useCart } from "./CartProvider";
import { MinusIcon, PlusIcon } from "./Icons";
import { naira } from "../lib/food";

export function Lines({ editable = true }) {
  const cart = useCart();
  return (
    <ul className="lines">
      {cart.lines.map(l => (
        <li key={l.id} className="line">
          <span className="line-name">{l.name}</span>
          <span className="price" style={{ fontSize: 15 }}>{naira(l.price_kobo * l.qty)}</span>
          {editable ? (
            <div className="qty" role="group" aria-label={`${l.name}, ${l.qty}`}>
              <button type="button" onClick={() => cart.setQty(l.id, l.qty - 1)} aria-label={l.qty === 1 ? `Remove ${l.name}` : "One fewer"}><MinusIcon /></button>
              <span>{l.qty}</span>
              <button type="button" onClick={() => cart.setQty(l.id, l.qty + 1)} disabled={l.qty >= 20} aria-label="One more"><PlusIcon /></button>
            </div>
          ) : <span className="muted small">× {l.qty}</span>}
        </li>
      ))}
    </ul>
  );
}

export function Totals() {
  const cart = useCart();
  return (
    <div className="sum">
      <div><span className="muted">Food</span><span>{naira(cart.subtotal)}</span></div>
      <div><span className="muted">Delivery</span><span>{naira(cart.deliveryFee)}</span></div>
      <div className="total"><span>Total</span><span>{naira(cart.total)}</span></div>
    </div>
  );
}

// The side panel next to a menu.
export default function OrderSummary({ kitchenId }) {
  const cart = useCart();
  if (!cart?.loaded) return <aside className="order-panel" aria-label="Your order" />;
  const here = cart.kitchen?.id === kitchenId;
  return (
    <aside className="order-panel" aria-label="Your order">
      <h2 className="h3">Your order</h2>
      {cart.count === 0 ? (
        <p className="muted small">Nothing yet. Tap + on a dish to add it.</p>
      ) : (
        <>
          {!here && <p className="note-box">This order is from {cart.kitchen.name}.</p>}
          <Lines />
          <Totals />
          <Link href="/checkout" className="btn full">Go to checkout</Link>
        </>
      )}
    </aside>
  );
}

// The bar that slides up from the bottom on phones once something is added.
export function CartBar({ menuOnly = false }) {
  const cart = useCart();
  if (!cart?.loaded || !cart.count) return null;
  return (
    <div className={`cartbar ${menuOnly ? "menu-only" : ""}`}>
      <div>
        <span>{cart.count} {cart.count === 1 ? "item" : "items"} from {cart.kitchen.name}</span>
        <b>{naira(cart.total)}</b>
      </div>
      <Link href="/checkout" className="btn small" style={{ background: "var(--yolk)", borderColor: "var(--yolk)", color: "var(--ink)" }}>Checkout</Link>
    </div>
  );
}
