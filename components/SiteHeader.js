"use client";
// The top of every customer page: logo, links, your account and your order.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { getSession } from "../lib/clientApi";
import { BagIcon, UserIcon } from "./Icons";

export function Logo({ href = "/" }) {
  return <Link href={href} className="logo" aria-label="Swiftplate home"><span className="logo-mark" aria-hidden="true" />swiftplate</Link>;
}

export default function SiteHeader() {
  const cart = useCart();
  const [me, setMe] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [bumping, setBumping] = useState(false);

  useEffect(() => {
    const read = () => setMe(getSession("customer")?.user || null);
    read();
    window.addEventListener("swiftplate:session", read);
    window.addEventListener("storage", read);
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("swiftplate:session", read);
      window.removeEventListener("storage", read);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!cart?.bump) return;
    setBumping(true);
    const t = setTimeout(() => setBumping(false), 460);
    return () => clearTimeout(t);
  }, [cart?.bump]);

  const count = cart?.count || 0;
  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`}>
      <div className="wrap">
        <Logo />
        <nav className="nav" aria-label="Main">
          <Link href="/#kitchens">Kitchens</Link>
          <Link href="/platform">How it's built</Link>
        </nav>
        {me ? (
          <Link href="/orders" className="account" aria-label={`Your orders, signed in as ${me.full_name}`}>
            <span className="avatar" aria-hidden="true">{me.full_name?.[0] || "?"}</span>
            <span className="label">Orders</span>
          </Link>
        ) : (
          <Link href="/login?as=customer" className="account"><UserIcon width="22" height="22" /><span className="label">Sign in</span></Link>
        )}
        <Link href="/checkout" className={`cart-btn ${bumping ? "bump" : ""}`} aria-label={count ? `Your order, ${count} ${count === 1 ? "item" : "items"}` : "Your order, empty"}>
          <BagIcon />
          {count > 0 ? <span className="count">{count}</span> : <span className="label">Order</span>}
        </Link>
      </div>
    </header>
  );
}
