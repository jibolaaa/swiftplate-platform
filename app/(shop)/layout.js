import { CartProvider } from "../../components/CartProvider";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

// Every customer page: the demo note, header, footer and the order being built.
export default function ShopLayout({ children }) {
  return (
    <CartProvider>
      <div className="ribbon">
        <div className="wrap">
          <span>A working demo: order something, then run the kitchen and rider side yourself.</span>
          <a href="/platform">See how it works</a>
        </div>
      </div>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}
