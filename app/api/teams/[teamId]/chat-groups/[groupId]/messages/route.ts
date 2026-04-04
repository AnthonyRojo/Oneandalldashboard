import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  badRequest,
  serverError,
  success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/chat-groups/[groupId]/messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; groupId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, groupId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:sender_id (id, name, email, avatar_url)
      `)
      .eq("team_id", teamId)
      .eq("chat_group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    const formatted = (messages || []).map((m: Record<string, unknown>) => {
      const sender = m.sender as Record<string, unknown> | null;
      return {
        id: m.id,
        teamId: m.team_id,
        groupId: m.chat_group_id,
        authorId: m.sender_id,
        authorName: sender?.name || "Unknown",
        content: m.content,
        createdAt: m.created_at,
        editedAt: m.edited_at,
      };
    });

    return success({ messages: formatted });
  } catch (err) {
    console.error("Get group messages error:", err);
    return serverError("Failed to get group messages");
  }
}

// POST /api/teams/[teamId]/chat-groups/[groupId]/messages
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; groupId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, groupId } = await params;
    const { content } = await request.json();

    if (!content?.trim()) return badRequest("Content required");

    const supabase = getSupabaseAdmin();

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        team_id: teamId,
        chat_group_id: groupId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: message.id,
      teamId: message.team_id,
      groupId: message.chat_group_id,
      authorId: message.sender_id,
      authorName: profile?.name || "Unknown",
      content: message.content,
      createdAt: message.created_at,
    };

    return success({ message: formatted });
  } catch (err) {
    console.error("Send group message error:", err);
    return serverError("Failed to send group message");
  }
}
