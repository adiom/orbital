import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { areaMember, chat, chatMember } from "@/lib/db/schema";

/**
 * GET /api/areas/[id]/chats
 * Get all chats in an Area
 */
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is a member of the Area
    const [membership] = await db
      .select()
      .from(areaMember)
      .where(
        and(
          eq(areaMember.areaId, params.id),
          eq(areaMember.userId, session.user.id)
        )
      );

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this Area" },
        { status: 403 }
      );
    }

    // Get all group chats in the Area (all Area members can see them)
    const allChats = await db
      .select({
        id: chat.id,
        title: chat.title,
        chatType: chat.chatType,
        areaId: chat.areaId,
        createdAt: chat.createdAt,
      })
      .from(chat)
      .where(eq(chat.areaId, params.id))
      .orderBy(chat.createdAt);

    // For each chat, check if user is explicitly a member and get their role
    const chatsWithRole = await Promise.all(
      allChats.map(async (chatItem) => {
        const [memberInfo] = await db
          .select({ role: chatMember.role })
          .from(chatMember)
          .where(
            and(
              eq(chatMember.chatId, chatItem.id),
              eq(chatMember.userId, session.user.id)
            )
          );

        return {
          ...chatItem,
          userRole: memberInfo?.role || "member", // Default to member if not explicitly added
        };
      })
    );

    return NextResponse.json({ chats: chatsWithRole });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/areas/[id]/chats
 * Create a new chat in an Area (personal or group)
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, chatType = "group", memberUserIds = [] } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (chatType !== "personal" && chatType !== "group") {
      return NextResponse.json(
        { error: "Invalid chat type. Must be 'personal' or 'group'" },
        { status: 400 }
      );
    }

    // Check if user is a member of the Area with appropriate permissions
    const [membership] = await db
      .select()
      .from(areaMember)
      .where(
        and(
          eq(areaMember.areaId, params.id),
          eq(areaMember.userId, session.user.id)
        )
      );

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this Area" },
        { status: 403 }
      );
    }

    // Create the chat
    const [newChat] = await db
      .insert(chat)
      .values({
        title,
        chatType,
        userId: session.user.id, // Creator of the chat
        areaId: params.id,
        visibility: "private",
        createdAt: new Date(),
      })
      .returning();

    // Add creator as admin
    await db.insert(chatMember).values({
      chatId: newChat.id,
      userId: session.user.id,
      role: "admin",
      joinedAt: new Date(),
    });

    // Add other members if provided (for group chats)
    if (chatType === "group" && memberUserIds.length > 0) {
      const memberRecords = memberUserIds
        .filter((uid: string) => uid !== session.user.id) // Don't duplicate creator
        .map((uid: string) => ({
          chatId: newChat.id,
          userId: uid,
          role: "member" as const,
          joinedAt: new Date(),
        }));

      if (memberRecords.length > 0) {
        await db.insert(chatMember).values(memberRecords);
      }
    }

    // Get full chat with member count
    const [members] = await db
      .select({
        count: chatMember.userId,
      })
      .from(chatMember)
      .where(eq(chatMember.chatId, newChat.id));

    return NextResponse.json(
      {
        chat: {
          ...newChat,
          memberCount: members?.count || 1,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
