import Link from "next/link";
import { DishCard, KitchenCard } from "../../components/Cards";
import Reveal from "../../components/Reveal";
import { ArrowRight } from "../../components/Icons";
import { dishPhoto, naira, DELIVERY_FEE_KOBO } from "../../lib/food";
import { getKitchens } from "../../lib/menu";
import { DEMO_PEOPLE, ROLE_LABEL } from "../../lib/roles";

export const revalidate = 60;

export default async function Home() {
  const kitchens = await getKitchens();
  const dishes = kitchens.flatMap(k => k.menu.map(d => ({ dish: d, kitchen: { id: k.id, name: k.name } })));

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="hero-text">
            <p className="eyebrow">Food delivery for Lagos</p>
            <h1 className="display">Lagos food,<br />hot at your door<span className="dot">.</span></h1>
            <p className="lead">Order from kitchens near you, follow every step from the pot to your gate, and pay the rider when it arrives.</p>
            <div className="hero-actions">
              <a className="btn" href="#kitchens">See what's cooking <ArrowRight /></a>
              <Link className="btn ghost" href="/platform">How it's built</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <figure className="a"><img src={dishPhoto({ name: "jollof" }, 900)} alt="" /></figure>
            <figure className="b"><img src={dishPhoto({ name: "suya" }, 600)} alt="" /></figure>
            <figure className="c"><img src={dishPhoto({ name: "chapman" }, 400)} alt="" /></figure>
            <div className="hero-badge"><b>On the way</b><span className="muted">Your jollof left the kitchen</span></div>
          </div>
        </div>
      </section>

      <section id="kitchens" className="section">
        <div className="wrap">
          <Reveal className="sec-head">
            <h2 className="title">Open now</h2>
            <p className="muted">{kitchens.length ? `${kitchens.length} ${kitchens.length === 1 ? "kitchen" : "kitchens"} taking orders. ${naira(DELIVERY_FEE_KOBO)} delivery anywhere in Lagos.` : ""}</p>
          </Reveal>
          {kitchens.length === 0 ? (
            <p className="note-box">No kitchens are taking orders right now. Check back soon.</p>
          ) : (
            <div className={`kitchens ${kitchens.length === 1 ? "one" : ""}`}>
              {kitchens.map((k, i) => <KitchenCard key={k.id} kitchen={k} eager={i === 0} />)}
            </div>
          )}
        </div>
      </section>

      {dishes.length > 0 && (
        <section className="section">
          <div className="wrap">
            <Reveal className="sec-head">
              <h2 className="title">On the menu today</h2>
              <p className="muted">Tap + to add a dish to your order.</p>
            </Reveal>
            <div className="dish-row">
              {dishes.map(({ dish, kitchen }) => <DishCard key={dish.id} dish={dish} kitchen={kitchen} showKitchen={kitchens.length > 1} />)}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap">
          <Reveal className="sec-head"><h2 className="title">How it works</h2></Reveal>
          <ol className="steps3">
            <li><b className="h3">Pick a kitchen</b><span className="muted">See what's cooking near you and add dishes to your order.</span></li>
            <li><b className="h3">Order in a tap</b><span className="muted">Add your address and send it. You pay the rider when the food arrives.</span></li>
            <li><b className="h3">Follow every step</b><span className="muted">Accepted, cooking, picked up, at your gate. Your order page updates by itself.</span></li>
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal className="builtwith">
            <div style={{ display: "grid", gap: 14 }}>
              <p className="eyebrow" style={{ color: "var(--yolk)" }}>For recruiters and developers</p>
              <h2 className="title">One platform, four apps<span className="dot">.</span></h2>
              <p className="lead">Every order passes through a customer, a kitchen, a rider and an admin, each with their own screens and permissions. Sign in as each one and run an order from start to finish.</p>
              <Link href="/platform" className="btn light" style={{ justifySelf: "start" }}>How it's built <ArrowRight /></Link>
            </div>
            <div className="roles4">
              {DEMO_PEOPLE.map(p => (
                <Link key={p.role} href={`/login?as=${p.role}`} className="role">
                  <i aria-hidden="true">{p.icon}</i>
                  <b>{ROLE_LABEL[p.role]}</b>
                  <span>{p.does}</span>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
