import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// PUT /api/teams/[teamId]/messages/[messageId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; messageId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, messageId } = await params;
    const { content } = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: message, error } = await supabase
      .from("messages")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("team_id", teamId)
      .select(`
        *,
        sender:sender_id (id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    const sender = message.sender as Record<string, unknown> | null;
    const formatted = {
      id: message.id,
      teamId: message.team_id,
      authorId: message.sender_id,
      authorName: sender?.name || "Unknown",
      content: message.content,
      createdAt: message.created_at,
      editedAt: message.edited_at,
    };

    return success({ message: formatted });
  } catch (err) {
    console.error("Edit message error:", err);
    return serverError("Failed to edit message");
  }
}

// DELETE /api/teams/[teamId]/messages/[messageId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; messageId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, messageId } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("team_id", teamId);

    if (error) throw error;
    return success({ success: true });
  } catch (err) {
    console.error("Delete message error:", err);
    return serverError("Failed to delete message");
  }
}
