import { notFound } from "next/navigation";
import FoodImage from "../../../../components/FoodImage";
import { MenuItem } from "../../../../components/Cards";
import OrderSummary, { CartBar } from "../../../../components/OrderSummary";
import { PinIcon, BikeIcon } from "../../../../components/Icons";
import { dishKind, dishPhoto, kitchenPhoto, naira, DELIVERY_FEE_KOBO } from "../../../../lib/food";
import { getKitchen } from "../../../../lib/menu";

export const revalidate = 60;

const GROUPS = [["jollof", "Rice"], ["soup", "Soups and swallow"], ["grill", "Grills and wraps"], ["spread", "More dishes"], ["drink", "Drinks"]];

export async function generateMetadata({ params }) {
  const k = await getKitchen(params.id).catch(() => null);
  return { title: k ? k.name : "Kitchen" };
}

export default async function KitchenPage({ params }) {
  const kitchen = await getKitchen(params.id).catch(() => null);
  if (!kitchen) notFound();
  const groups = GROUPS
    .map(([kind, label]) => ({ label, dishes: kitchen.menu.filter(d => dishKind(d.name) === kind) }))
    .filter(g => g.dishes.length);

  return (
    <>
      <section className="k-hero">
        <FoodImage src={kitchen.menu[0] ? dishPhoto(kitchen.menu[0], 1600) : kitchenPhoto()} alt="" eager />
        <div className="wrap">
          <span className="chip open">{kitchen.is_open ? "Open now" : "Closed"}</span>
          <h1 className="display" style={{ fontSize: "clamp(40px, 10vw, 76px)" }}>{kitchen.name}</h1>
          {kitchen.description && <p className="lead">{kitchen.description}</p>}
          <p className="k-facts">
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><PinIcon width="16" height="16" />{kitchen.address}</span>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><BikeIcon width="16" height="16" />{naira(DELIVERY_FEE_KOBO)} delivery</span>
          </p>
        </div>
      </section>

      <div className="wrap menu-layout">
        <div>
          {groups.length === 0 && <p className="note-box">This kitchen hasn't added any dishes yet.</p>}
          {groups.map(g => (
            <section key={g.label} className="menu-group" aria-label={g.label}>
              <h2 className="h3" style={{ fontSize: 24 }}>{g.label}</h2>
              <div className="menu-list">
                {g.dishes.map(d => <MenuItem key={d.id} dish={d} kitchen={kitchen} />)}
              </div>
            </section>
          ))}
        </div>
        <OrderSummary kitchenId={kitchen.id} />
      </div>
      <CartBar menuOnly />
      <div style={{ height: 80 }} aria-hidden="true" />
    </>
  );
}
