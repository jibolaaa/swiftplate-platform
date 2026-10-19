"use client";
// The order being built, kept on the phone so it survives a refresh.
// One kitchen per order (the API needs every dish from the same
// restaurant), so adding from a second kitchen asks first.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DELIVERY_FEE_KOBO } from "../lib/food";

const KEY = "swiftplate_cart";
const EMPTY = { kitchen: null, lines: [] };
const Ctx = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [ask, setAsk] = useState(null); // a dish from another kitchen, waiting for an answer
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved?.lines?.length && saved.kitchen) setCart(saved);
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {}
  }, [cart, loaded]);

  const put = useCallback((kitchen, dish, fresh) => {
    setCart(c => {
      const base = fresh ? { kitchen, lines: [] } : { kitchen: c.kitchen || kitchen, lines: c.lines };
      const i = base.lines.findIndex(l => l.id === dish.id);
      const lines = i === -1
        ? [...base.lines, { id: dish.id, name: dish.name, price_kobo: Number(dish.price_kobo), image_url: dish.image_url || null, qty: 1 }]
        : base.lines.map((l, j) => j === i ? { ...l, qty: Math.min(20, l.qty + 1) } : l);
      return { kitchen: base.kitchen, lines };
    });
    setBump(n => n + 1);
  }, []);

  const add = useCallback((kitchen, dish) => {
    if (cart.lines.length && cart.kitchen && cart.kitchen.id !== kitchen.id) { setAsk({ kitchen, dish }); return; }
    put(kitchen, dish, !cart.lines.length);
  }, [cart, put]);

  const setQty = useCallback((id, qty) => {
    setCart(c => {
      const lines = qty < 1 ? c.lines.filter(l => l.id !== id) : c.lines.map(l => l.id === id ? { ...l, qty: Math.min(20, qty) } : l);
      return lines.length ? { ...c, lines } : EMPTY;
    });
  }, []);

  const clear = useCallback(() => setCart(EMPTY), []);

  const value = useMemo(() => {
    const count = cart.lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = cart.lines.reduce((n, l) => n + l.qty * l.price_kobo, 0);
    return {
      ...cart, loaded, count, subtotal, bump,
      deliveryFee: count ? DELIVERY_FEE_KOBO : 0,
      total: subtotal + (count ? DELIVERY_FEE_KOBO : 0),
      qtyOf: (id) => cart.lines.find(l => l.id === id)?.qty || 0,
      add, setQty, clear
    };
  }, [cart, loaded, bump, add, setQty, clear]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {ask && (
        <div className="dialog-root" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setAsk(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="swap-title">
            <h2 id="swap-title" className="h3">Start a new order?</h2>
            <p className="muted">Your order is from {cart.kitchen?.name}. One order can only come from one kitchen, so adding {ask.dish.name} from {ask.kitchen.name} clears it.</p>
            <div className="btns">
              <button type="button" className="btn" autoFocus onClick={() => { put(ask.kitchen, ask.dish, true); setAsk(null); }}>Start a new order</button>
              <button type="button" className="btn ghost" onClick={() => setAsk(null)}>Keep my order</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useCart = () => useContext(Ctx);
