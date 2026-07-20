// Register. Public roles only: customer, vendor, rider.
// Admin accounts are never self-service (they come from seeding),
// otherwise anyone could sign up as admin. That is an RBAC rule.
import bcrypt from "bcryptjs";
import { requireDb } from "../../../../lib/db";
import { signToken } from "../../../../lib/auth";

const PUBLIC_ROLES = ["customer", "vendor", "rider"];

export async function POST(req) {
  try {
    const { full_name, email, phone, password, role } = await req.json();
    if (!full_name || !email || !phone || !password || !role)
      return Response.json({ error: "All fields are required." }, { status: 400 });
    if (!PUBLIC_ROLES.includes(role))
      return Response.json({ error: "Role must be customer, vendor or rider." }, { status: 400 });
    if (password.length < 8)
      return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const sql = requireDb();
    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await sql`
      INSERT INTO users (role, full_name, email, phone, password_hash)
      VALUES (${role}, ${full_name}, ${email.toLowerCase()}, ${phone}, ${password_hash})
      RETURNING id, role, full_name, email
    `;

    // Riders get their satellite profile row immediately (1-to-1 pattern).
    if (role === "rider") {
      await sql`INSERT INTO rider_profiles (user_id) VALUES (${user.id})`;
    }

    const token = await signToken(user);
    return Response.json({ token, user });
  } catch (e) {
    if (String(e.message).includes("duplicate key"))
      return Response.json({ error: "Email or phone already registered." }, { status: 409 });
    return Response.json({ error: e.message }, { status: 500 });
  }
}
