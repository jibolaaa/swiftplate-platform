// "Who am I?" Any logged-in role can call this. It is also the
// simplest way to SEE RBAC working: the response shows your role.
import { requireAuth, authError } from "../../../../lib/auth";

export async function GET(req) {
  try {
    const user = await requireAuth(req); // no role list = any logged-in user
    return Response.json({ id: user.sub, role: user.role, name: user.name });
  } catch (e) {
    return authError(e);
  }
}
