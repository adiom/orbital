import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { chat, chatMember } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/chats/[chatId]/members
 * Get all members of a chat
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ chatId: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is a member of the chat
    const [userMembership] = await db
      .select()
      .from(chatMember)
      .where(
        and(
          eq(chatMember.chatId, params.chatId),
          eq(chatMember.userId, session.user.id)
        )
      );

    if (!userMembership) {
      return NextResponse.json(
        { error: "You are not a member of this chat" },
        { status: 403 }
      );
    }

    // Get all members
    const members = await db
      .select()
      .from(chatMember)
      .where(eq(chatMember.chatId, params.chatId))
      .orderBy(chatMember.joinedAt);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching chat members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats/[chatId]/members
 * Add a member to a group chat
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ chatId: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, role = "member" } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Check if requester is admin of the chat
    const [userMembership] = await db
      .select()
      .from(chatMember)
      .where(
        and(
          eq(chatMember.chatId, params.chatId),
          eq(chatMember.userId, session.user.id)
        )
      );

    if (!userMembership || userMembership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can add members" },
        { status: 403 }
      );
    }

    // Check if chat is a group chat
    const [chatRecord] = await db
      .select()
      .from(chat)
      .where(eq(chat.id, params.chatId));

    if (!chatRecord) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chatRecord.chatType !== "group") {
      return NextResponse.json(
        { error: "Cannot add members to personal chats" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(chatMember)
      .where(
        and(eq(chatMember.chatId, params.chatId), eq(chatMember.userId, userId))
      );

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 }
      );
    }

    // Add the member
    const [newMember] = await db
      .insert(chatMember)
      .values({
        chatId: params.chatId,
        userId,
        role,
        joinedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    console.error("Error adding chat member:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats/[chatId]/members/[userId]
 * Remove a member from a group chat
 */
export async function DELETE(
  request: Request,
  props: { params: Promise<{ chatId: string; userId: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if requester is admin of the chat
    const [userMembership] = await db
      .select()
      .from(chatMember)
      .where(
        and(
          eq(chatMember.chatId, params.chatId),
          eq(chatMember.userId, session.user.id)
        )
      );

    if (!userMembership || userMembership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can remove members" },
        { status: 403 }
      );
    }

    // Remove the member
    await db
      .delete(chatMember)
      .where(
        and(
          eq(chatMember.chatId, params.chatId),
          eq(chatMember.userId, params.userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing chat member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
