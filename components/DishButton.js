"use client";
// The + on a dish, which turns into − 1 + once it's in the order.
import { useCart } from "./CartProvider";
import { MinusIcon, PlusIcon } from "./Icons";

export default function DishButton({ kitchen, dish }) {
  const cart = useCart();
  const qty = cart?.qtyOf(dish.id) || 0;
  if (!qty) {
    return (
      <button type="button" className="add" onClick={() => cart.add(kitchen, dish)} aria-label={`Add ${dish.name}`}>
        <PlusIcon />
      </button>
    );
  }
  return (
    <div className="qty" role="group" aria-label={`${dish.name} in your order`}>
      <button type="button" onClick={() => cart.setQty(dish.id, qty - 1)} aria-label={qty === 1 ? `Remove ${dish.name}` : "One fewer"}><MinusIcon /></button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => cart.add(kitchen, dish)} disabled={qty >= 20} aria-label="One more"><PlusIcon /></button>
    </div>
  );
}
