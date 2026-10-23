import { CartProvider } from "../../components/CartProvider";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

// Every customer page: the demo note, header, footer and the order being built.
export default function ShopLayout({ children }) {
  return (
    <CartProvider>
      <div className="ribbon">
        <div className="wrap">
          <span>A working demo. Payments run in Paystack test mode, so no real money moves.</span>
        </div>
      </div>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}
