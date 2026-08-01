import { requireAdmin } from "@/lib/admin/access";

export const dynamic = "force-dynamic";

// GET /api/admin/access - tells the client whether to show the station link
export async function GET() {
  const admin = await requireAdmin();
  return Response.json({ isAdmin: Boolean(admin) });
}
