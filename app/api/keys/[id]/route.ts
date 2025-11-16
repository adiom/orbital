import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { revokeApiKey } from "@/lib/auth/api-keys";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// DELETE /api/keys/[id] - Revoke an API key
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return Response.json(
        { error: "API key ID is required" },
        { status: 400 }
      );
    }

    const revoked = await revokeApiKey(id, session.user.id);

    if (!revoked) {
      return Response.json(
        { error: "API key not found or already revoked" },
        { status: 404 }
      );
    }

    return Response.json({ message: "API key revoked successfully" });
  } catch (error) {
    console.error("Failed to revoke API key:", error);
    return Response.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
