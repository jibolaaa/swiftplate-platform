import { requireDb } from "../../../lib/db";

// Read fresh on every request. Without this, Next.js saves the list once at
// build time and the apps never see a kitchen open, close or change its menu.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = requireDb();
    const restaurants = await sql`
      SELECT r.id, r.name, r.description, r.address, r.is_open
      FROM restaurants r WHERE r.is_open = TRUE ORDER BY r.created_at
    `;
    const menus = await sql`
      SELECT id, restaurant_id, name, description, price_kobo, image_url
      FROM menu_items WHERE is_available = TRUE ORDER BY created_at
    `;
    return Response.json({
      restaurants: restaurants.map(r => ({
        ...r,
        menu: menus.filter(m => m.restaurant_id === r.id)
      }))
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
