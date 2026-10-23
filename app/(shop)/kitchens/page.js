import { DishCard, KitchenCard } from "../../../components/Cards";
import Reveal from "../../../components/Reveal";
import { naira, DELIVERY_FEE_KOBO } from "../../../lib/food";
import { getKitchens } from "../../../lib/menu";

export const revalidate = 60;
export const metadata = { title: "Kitchens", description: "Every kitchen taking orders on Swiftplate, and what they're cooking today." };

// Every kitchen that's open, then every dish on the menu today.
export default async function KitchensPage() {
  const kitchens = await getKitchens();
  const dishes = kitchens.flatMap(k => k.menu.map(d => ({ dish: d, kitchen: { id: k.id, name: k.name } })));

  return (
    <div className="wrap page">
      <section className="page-head">
        <h1 className="title">Kitchens</h1>
        <p className="muted">{kitchens.length ? `${kitchens.length} ${kitchens.length === 1 ? "kitchen" : "kitchens"} taking orders. ${naira(DELIVERY_FEE_KOBO)} delivery anywhere in Lagos.` : "No kitchens are taking orders right now. Check back soon."}</p>
      </section>
      {kitchens.length > 0 && (
        <div className={`kitchens ${kitchens.length === 1 ? "one" : ""}`}>
          {kitchens.map((k, i) => <KitchenCard key={k.id} kitchen={k} eager={i === 0} />)}
        </div>
      )}

      {dishes.length > 0 && (
        <section className="section">
          <Reveal className="sec-head">
            <h2 className="title">On the menu today</h2>
            <p className="muted">Tap + to add a dish to your order.</p>
          </Reveal>
          <div className="dish-row">
            {dishes.map(({ dish, kitchen }) => <DishCard key={dish.id} dish={dish} kitchen={kitchen} showKitchen={kitchens.length > 1} />)}
          </div>
        </section>
      )}
    </div>
  );
}
