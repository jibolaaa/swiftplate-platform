// Kitchens and their menus, read straight from the database by the
// pages that show them (the same data /api/restaurants serves the apps).
import { sql } from "./db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getKitchens() {
  if (!sql) return [];
  try {
    const kitchens = await sql`
      SELECT id, name, description, address, is_open FROM restaurants
      WHERE is_open = TRUE ORDER BY created_at`;
    const dishes = await sql`
      SELECT id, restaurant_id, name, description, price_kobo, image_url FROM menu_items
      WHERE is_available = TRUE ORDER BY created_at`;
    return kitchens.map(k => ({ ...k, menu: dishes.filter(d => d.restaurant_id === k.id).map(d => ({ ...d, price_kobo: Number(d.price_kobo) })) }));
  } catch (e) {
    console.error("kitchens", e);
    return [];
  }
}

export async function getKitchen(id) {
  if (!sql || !UUID.test(String(id))) return null;
  const [k] = await sql`SELECT id, name, description, address, is_open FROM restaurants WHERE id = ${id}`;
  if (!k) return null;
  const menu = await sql`
    SELECT id, restaurant_id, name, description, price_kobo, image_url FROM menu_items
    WHERE restaurant_id = ${id} AND is_available = TRUE ORDER BY created_at`;
  return { ...k, menu: menu.map(d => ({ ...d, price_kobo: Number(d.price_kobo) })) };
}
