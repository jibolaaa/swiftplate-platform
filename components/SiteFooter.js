import Link from "next/link";
import { Logo } from "./SiteHeader";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <Logo />
          <p className="small" style={{ color: "#cdbfb0", maxWidth: "26em" }}>Hot food from Lagos kitchens. Order, pay by card or transfer, and follow it to your door.</p>
        </div>
        <div className="foot-cols">
          <nav aria-label="Order">
            <b>Order</b>
            <Link href="/kitchens">Kitchens</Link>
            <Link href="/orders">Your orders</Link>
            <Link href="/checkout">Checkout</Link>
          </nav>
          <nav aria-label="Work with Swiftplate">
            <b>Partners</b>
            <Link href="/login?as=vendor">Kitchen sign-in</Link>
            <Link href="/login?as=rider">Rider sign-in</Link>
            <Link href="/login?as=admin">Admin sign-in</Link>
          </nav>
          <nav aria-label="About this project">
            <b>The project</b>
            <Link href="/platform">How it's built</Link>
            <a href="https://github.com/jibolaaa/swiftplate-platform" target="_blank" rel="noopener noreferrer">Code on GitHub</a>
            <Link href="/test">API test console</Link>
          </nav>
        </div>
        <p className="foot-note">
          Swiftplate is a demo platform by <a href="https://ibrahimraji.vercel.app" target="_blank" rel="noopener noreferrer">Raji Ibrahim Ajibola</a>. The kitchens and orders are for testing; payments run in Paystack test mode, so no food is delivered and no real money is taken.
        </p>
      </div>
    </footer>
  );
}
