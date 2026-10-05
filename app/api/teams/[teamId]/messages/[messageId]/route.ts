import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  requireTeamMember, isAdmin, forbidden,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// PUT /api/teams/[teamId]/messages/[messageId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; messageId: string }> }
) {
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const { teamId, messageId } = await params;
    const { content } = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: current } = await supabase.from("messages").select("sender_id").eq("id", messageId).eq("team_id", teamId).maybeSingle();
    if (current && current.sender_id !== user.id) return forbidden("You can only edit your own messages");

    const { data: message, error } = await supabase
      .from("messages")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("team_id", teamId)
      .select("*")
      .single();

    if (error) throw error;

    const formatted = {
      id: message.id,
      teamId: message.team_id,
      authorId: message.sender_id,
      authorName: message.sender_name || "Unknown",
      content: message.content,
      createdAt: message.created_at,
      editedAt: message.updated_at,
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
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const { teamId, messageId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: current } = await supabase.from("messages").select("sender_id").eq("id", messageId).eq("team_id", teamId).maybeSingle();
    if (current && current.sender_id !== user.id && !isAdmin(auth.role)) return forbidden("You can only delete your own messages");

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
