// Seeds demo data so the platform has something to play with.
// Protected by SEED_SECRET so random visitors cannot reset your data.
// Creates: 4 users (one per role), 1 restaurant, 4 menu items.
// All demo passwords are: password123
import bcrypt from "bcryptjs";
import { requireDb } from "../../../../lib/db";

export async function POST(req) {
  try {
    const { secret } = await req.json();
    if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET)
      return Response.json({ error: "Wrong seed secret." }, { status: 403 });

    const sql = requireDb();
    const hash = await bcrypt.hash("password123", 10);

    const mkUser = async (role, name, email, phone) => {
      const [u] = await sql`
        INSERT INTO users (role, full_name, email, phone, password_hash)
        VALUES (${role}, ${name}, ${email}, ${phone}, ${hash})
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id, role, email
      `;
      return u;
    };

    const admin    = await mkUser("admin",    "Ada Admin",     "admin@swiftplate.test",    "+2340000000001");
    const vendor   = await mkUser("vendor",   "Vera Vendor",   "vendor@swiftplate.test",   "+2340000000002");
    const rider    = await mkUser("rider",    "Rex Rider",     "rider@swiftplate.test",    "+2340000000003");
    const customer = await mkUser("customer", "Chidi Customer","customer@swiftplate.test", "+2340000000004");

    await sql`
      INSERT INTO rider_profiles (user_id) VALUES (${rider.id})
      ON CONFLICT (user_id) DO NOTHING
    `;

    const [restaurant] = await sql`
      INSERT INTO restaurants (owner_id, name, description, address, is_open)
      VALUES (${vendor.id}, 'Mama Put Express', 'Proper Nigerian food, fast.', '12 Allen Avenue, Ikeja, Lagos', TRUE)
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `;

    let menuCount = 0;
    if (restaurant) {
      const items = [
        ["Jollof Rice & Chicken", "Smoky party jollof with grilled chicken.", 350000],
        ["Egusi & Pounded Yam",   "Rich egusi with assorted meat.",          420000],
        ["Suya Wrap",             "Spicy beef suya in a soft wrap.",         250000],
        ["Chapman (50cl)",        "The classic, chilled.",                   120000]
      ];
      for (const [name, description, price_kobo] of items) {
        await sql`
          INSERT INTO menu_items (restaurant_id, name, description, price_kobo)
          VALUES (${restaurant.id}, ${name}, ${description}, ${price_kobo})
        `;
        menuCount++;
      }
    }

    return Response.json({
      ok: true,
      seeded: {
        users: [admin.email, vendor.email, rider.email, customer.email],
        password_for_all: "password123",
        restaurant: restaurant?.name || "(already existed)",
        menu_items_added: menuCount
      }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
