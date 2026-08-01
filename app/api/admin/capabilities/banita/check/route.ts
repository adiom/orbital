import { requireAdmin } from "@/lib/admin/access";
import { BANITA_MODEL, checkBanita } from "@/lib/capabilities/banita";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const result = await checkBanita();
  return Response.json({
    ...result,
    model: BANITA_MODEL,
    apiUrl: process.env.BANITA_IMAGE_API_URL || "https://banita.canfly.org",
    hasApiKey: Boolean(process.env.BANITA_API_KEY?.trim()),
    checkedAt: new Date().toISOString(),
  });
}
