// Admin-only. A vendor, rider or customer calling this gets 403.
// That 403 is not a bug: it is role-based access control doing its job.
import { requireAuth, authError } from "../../../../lib/auth";

export async function GET(req) {
  try {
    const user = await requireAuth(req, ["admin"]);
    return Response.json({ ok: true, message: `Welcome, admin ${user.name}. You can see everything.` });
  } catch (e) {
    return authError(e);
  }
}
