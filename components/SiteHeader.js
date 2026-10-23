"use client";
// The top of every customer page: logo, the main pages, your order, and a
// menu with your account, how Swiftplate is built and the other screens.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { clearSession, getSession } from "../lib/clientApi";
import { BagIcon, MenuIcon } from "./Icons";

export function Logo({ href = "/" }) {
  return <Link href={href} className="logo" aria-label="Swiftplate home"><span className="logo-mark" aria-hidden="true" />swiftplate</Link>;
}

const PAGES = [["/", "Home"], ["/kitchens", "Kitchens"], ["/orders", "Orders"]];

export default function SiteHeader() {
  const cart = useCart();
  const path = usePathname();
  const [me, setMe] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [bumping, setBumping] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

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

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => {
    if (!cart?.bump) return;
    setBumping(true);
    const t = setTimeout(() => setBumping(false), 460);
    return () => clearTimeout(t);
  }, [cart?.bump]);

  const here = (href) => (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined;
  const count = cart?.count || 0;
  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`}>
      <div className="wrap">
        <Logo />
        <nav className="nav" aria-label="Main">
          {PAGES.map(([href, label]) => <Link key={href} href={href} aria-current={here(href)}>{label}</Link>)}
        </nav>
        <Link href="/checkout" className={`cart-btn ${bumping ? "bump" : ""}`} aria-label={count ? `Your order, ${count} ${count === 1 ? "item" : "items"}` : "Your order, empty"}>
          <BagIcon />
          {count > 0 ? <span className="count">{count}</span> : <span className="label">Order</span>}
        </Link>
        <div className="menu-wrap" ref={box}>
          <button type="button" className="menu-btn" aria-expanded={open} aria-controls="site-menu" aria-label={me ? `Menu, signed in as ${me.full_name}` : "Menu"} onClick={() => setOpen(o => !o)}>
            {me ? <span className="avatar" aria-hidden="true">{me.full_name?.[0] || "?"}</span> : <MenuIcon />}
          </button>
          {open && (
            <div className="menu-panel" id="site-menu">
              {me ? (
                <div className="menu-who">
                  <span className="avatar" aria-hidden="true">{me.full_name?.[0] || "?"}</span>
                  <span><b>{me.full_name}</b><small>{me.email}</small></span>
                </div>
              ) : (
                <Link href="/login?as=customer" className="btn small full">Sign in</Link>
              )}
              <nav className="menu-pages" aria-label="Pages">
                {PAGES.map(([href, label]) => <Link key={href} href={href} aria-current={here(href)}>{href === "/orders" ? "Your orders" : label}</Link>)}
              </nav>
              <div className="menu-sec">
                <b>About this demo</b>
                <Link href="/platform">How Swiftplate is built</Link>
                <a href="https://github.com/jibolaaa/swiftplate-platform" target="_blank" rel="noopener noreferrer">Code on GitHub</a>
              </div>
              <div className="menu-sec">
                <b>Try the other side</b>
                <Link href="/vendor">Kitchen screen</Link>
                <Link href="/rider">Rider screen</Link>
                <Link href="/admin">Admin screen</Link>
              </div>
              {me && <button type="button" className="menu-signout" onClick={() => { clearSession("customer"); setOpen(false); }}>Sign out</button>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
