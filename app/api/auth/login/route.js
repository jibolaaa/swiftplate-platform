import bcrypt from "bcryptjs";
import { requireDb } from "../../../../lib/db";
import { signToken } from "../../../../lib/auth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return Response.json({ error: "Email and password required." }, { status: 400 });

    const sql = requireDb();
    const [user] = await sql`
      SELECT id, role, full_name, email, password_hash, is_active
      FROM users WHERE email = ${email.toLowerCase()}
    `;
    // Same error for "no user" and "wrong password": never reveal which.
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash)))
      return Response.json({ error: "Invalid email or password." }, { status: 401 });

    const token = await signToken(user);
    return Response.json({
      token,
      user: { id: user.id, role: user.role, full_name: user.full_name, email: user.email }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
