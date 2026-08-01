import { isAdminEmail, requireAdmin } from "@/lib/admin/access";
import {
  deleteUsers,
  previewDelete,
  resolveDeletable,
} from "@/lib/admin/delete-user";

export const dynamic = "force-dynamic";

const MAX_BATCH = 200;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Pulls a clean id list out of the request body. */
async function readIds(
  request: Request
): Promise<{ ids: string[] } | { error: string }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { error: "Тело запроса не разобралось" };
  }

  const raw = (body as { ids?: unknown })?.ids;

  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "Не выбрано ни одного человека" };
  }

  if (raw.length > MAX_BATCH) {
    return { error: `За раз можно удалить не больше ${MAX_BATCH}` };
  }

  const ids = [...new Set(raw.filter((id): id is string => UUID.test(String(id))))];

  if (ids.length === 0) {
    return { error: "Идентификаторы не похожи на настоящие" };
  }

  return { ids };
}

/** POST /api/admin/users — what a delete would take with it. Reads only. */
export async function POST(request: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = await readIds(request);

  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const { ids, skipped } = await resolveDeletable(
      parsed.ids,
      admin.userId,
      isAdminEmail
    );
    const impact = await previewDelete(ids);
    return Response.json({ impact, skipped });
  } catch (error) {
    console.error("[admin/users] preview failed:", error);
    return Response.json(
      { error: "Не удалось посчитать последствия", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/users — removes the accounts and everything behind them. */
export async function DELETE(request: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = await readIds(request);

  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const { ids, skipped } = await resolveDeletable(
      parsed.ids,
      admin.userId,
      isAdminEmail
    );

    if (ids.length === 0) {
      return Response.json({ deleted: 0, skipped });
    }

    console.warn(
      `[admin/users] ${admin.email} deleting ${ids.length} accounts: ${ids.join(", ")}`
    );

    const { deleted, impact } = await deleteUsers(ids);

    console.warn(
      `[admin/users] removed people=${deleted} cells=${impact.cells} messages=${impact.messages}`
    );

    return Response.json({ deleted, impact, skipped });
  } catch (error) {
    console.error("[admin/users] delete failed:", error);
    return Response.json(
      { error: "Не удалось удалить", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}
