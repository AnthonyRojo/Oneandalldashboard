import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// PUT /api/teams/[teamId]/announcements/[annId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; annId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, annId } = await params;
    const { content } = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: announcement, error } = await supabase
      .from("announcements")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", annId)
      .eq("team_id", teamId)
      .select(`
        *,
        author:created_by (id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    const author = announcement.author as Record<string, unknown> | null;
    const formatted = {
      id: announcement.id,
      teamId: announcement.team_id,
      authorId: announcement.created_by,
      authorName: author?.name || "Unknown",
      content: announcement.content,
      type: announcement.type,
      pinned: announcement.pinned,
      likes: announcement.likes || [],
      comments: announcement.comments || [],
      pollOptions: announcement.poll_options,
      pollVotes: announcement.poll_votes,
      createdAt: announcement.created_at,
      editedAt: announcement.edited_at,
    };

    return success({ announcement: formatted });
  } catch (err) {
    console.error("Update announcement error:", err);
    return serverError("Failed to update announcement");
  }
}

// DELETE /api/teams/[teamId]/announcements/[annId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; annId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, annId } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", annId)
      .eq("team_id", teamId);

    if (error) throw error;
    return success({ success: true });
  } catch (err) {
    console.error("Delete announcement error:", err);
    return serverError("Failed to delete announcement");
  }
}
