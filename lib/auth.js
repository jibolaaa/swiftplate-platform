// ===== AUTH + RBAC: the heart of the multi-role platform =====
//
// How it works:
// 1. login checks the password and signs a JWT containing { sub: userId, role }
// 2. every protected request carries that JWT in the Authorization header
// 3. requireAuth() verifies the token, and (optionally) checks the role
//    against an allow-list. THIS is role-based access control: same
//    backend, different permissions depending on who is asking.
import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

export async function signToken(user) {
  return await new SignJWT({ role: user.role, name: user.full_name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret());
  return payload; // { sub, role, name, iat, exp }
}

// Reads "Authorization: Bearer <token>" and enforces roles.
// Usage in a route:  const user = await requireAuth(req, ["vendor","admin"]);
export async function requireAuth(req, allowedRoles = null) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    const err = new Error("Not logged in.");
    err.status = 401;
    throw err;
  }
  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    const err = new Error("Invalid or expired login.");
    err.status = 401;
    throw err;
  }
  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    // Valid login, wrong role: a rider calling an admin endpoint lands here.
    const err = new Error(`Forbidden: requires role ${allowedRoles.join(" or ")}.`);
    err.status = 403;
    throw err;
  }
  return payload;
}

// Small helper to turn thrown auth errors into clean JSON responses.
export function authError(e) {
  return Response.json({ error: e.message }, { status: e.status || 500 });
}
