import Link from "next/link";
import FoodImage from "./FoodImage";
import DishButton from "./DishButton";
import { dishPhoto, kitchenPhoto, naira, DELIVERY_FEE_KOBO } from "../lib/food";

// A kitchen on the home page.
export function KitchenCard({ kitchen, eager }) {
  const cover = kitchen.menu[0] ? dishPhoto(kitchen.menu[0], 1200) : kitchenPhoto();
  const area = kitchen.address?.split(",").slice(-2, -1)[0]?.trim() || "Lagos";
  return (
    <Link href={`/r/${kitchen.id}`} className="kcard">
      <div className="kcard-img">
        <FoodImage src={cover} alt="" eager={eager} />
        <span className="chip open">Open now</span>
      </div>
      <div className="kcard-body">
        <h3 className="h3">{kitchen.name}</h3>
        {kitchen.description && <p className="muted">{kitchen.description}</p>}
        <p className="kcard-meta">
          <span>{area}</span>
          <span>{naira(DELIVERY_FEE_KOBO)} delivery</span>
          <span>{kitchen.menu.length} {kitchen.menu.length === 1 ? "dish" : "dishes"}</span>
        </p>
      </div>
    </Link>
  );
}

// A dish with its + button. `showKitchen` adds "from Mama Put Express".
export function DishCard({ dish, kitchen, showKitchen = false }) {
  return (
    <article className="dish">
      <div className="dish-img"><FoodImage src={dishPhoto(dish, 700)} alt={dish.name} /></div>
      <div className="dish-body">
        <h3 className="h3">{dish.name}</h3>
        {dish.description && <p className="dish-desc">{dish.description}</p>}
        {showKitchen && <Link href={`/r/${kitchen.id}`} className="dish-from">from {kitchen.name}</Link>}
        <div className="dish-foot">
          <span className="price">{naira(dish.price_kobo)}</span>
          <DishButton kitchen={{ id: kitchen.id, name: kitchen.name }} dish={dish} />
        </div>
      </div>
    </article>
  );
}

// A dish on a kitchen's menu: text on the left, photo with + on the right.
export function MenuItem({ dish, kitchen }) {
  return (
    <article className="mitem">
      <div className="mitem-text">
        <h3 className="h3" style={{ fontSize: 17 }}>{dish.name}</h3>
        {dish.description && <p className="dish-desc">{dish.description}</p>}
        <span className="price" style={{ marginTop: 6 }}>{naira(dish.price_kobo)}</span>
      </div>
      <div className="mitem-img">
        <FoodImage src={dishPhoto(dish, 300)} alt={dish.name} />
        <DishButton kitchen={{ id: kitchen.id, name: kitchen.name }} dish={dish} />
      </div>
    </article>
  );
}
