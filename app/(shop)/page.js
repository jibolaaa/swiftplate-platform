import Link from "next/link";
import { KitchenCard } from "../../components/Cards";
import Reveal from "../../components/Reveal";
import { ArrowRight } from "../../components/Icons";
import { dishPhoto, naira, DELIVERY_FEE_KOBO } from "../../lib/food";
import { getKitchens } from "../../lib/menu";

export const revalidate = 60;

// The front door: what Swiftplate is, a few kitchens that are open, and how
// ordering works. Every kitchen and every dish live on /kitchens.
export default async function Home() {
  const kitchens = await getKitchens();
  const first = kitchens.slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="hero-text">
            <p className="eyebrow">Food delivery for Lagos</p>
            <h1 className="display">Lagos food,<br />hot at your door<span className="dot">.</span></h1>
            <p className="lead">Order from kitchens near you, pay by card or transfer, and follow your food from the pot to your gate.</p>
            <div className="hero-actions">
              <Link className="btn" href="/kitchens">See kitchens <ArrowRight /></Link>
              <Link className="btn ghost" href="/orders">Track an order</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <figure className="a"><img src={dishPhoto({ name: "jollof" }, 900)} alt="" /></figure>
            <figure className="b"><img src={dishPhoto({ name: "suya" }, 600)} alt="" /></figure>
            <figure className="c"><img src={dishPhoto({ name: "chapman" }, 400)} alt="" /></figure>
            <div className="hero-badge"><b>Arriving around 7:45pm</b><span className="muted">Your jollof is on the way</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal className="sec-head">
            <h2 className="title">Open now</h2>
            <p className="muted">{kitchens.length ? `${naira(DELIVERY_FEE_KOBO)} delivery anywhere in Lagos.` : ""}</p>
          </Reveal>
          {first.length === 0 ? (
            <p className="note-box">No kitchens are taking orders right now. Check back soon.</p>
          ) : (
            <div className={`kitchens ${first.length === 1 ? "one" : ""}`}>
              {first.map((k, i) => <KitchenCard key={k.id} kitchen={k} eager={i === 0} />)}
            </div>
          )}
          {kitchens.length > 0 && (
            <Link href="/kitchens" className="btn ghost" style={{ marginTop: 18 }}>See all kitchens and dishes <ArrowRight /></Link>
          )}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal className="sec-head"><h2 className="title">How it works</h2></Reveal>
          <ol className="steps3">
            <li><b className="h3">Pick a kitchen</b><span className="muted">See what's cooking near you and add dishes to your order.</span></li>
            <li><b className="h3">Pay your way</b><span className="muted">Card or bank transfer, through Paystack. The kitchen starts once it's paid.</span></li>
            <li><b className="h3">Follow it home</b><span className="muted">See when it should arrive and where it is: cooking, picked up, on the road.</span></li>
          </ol>
        </div>
      </section>
    </>
  );
}
