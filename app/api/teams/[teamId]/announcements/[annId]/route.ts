import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  requireTeamMember, isAdmin, forbidden,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// PUT /api/teams/[teamId]/announcements/[annId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; annId: string }> }
) {
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const { teamId, annId } = await params;
    const { content } = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: current } = await supabase.from("announcements").select("author_id").eq("id", annId).eq("team_id", teamId).maybeSingle();
    if (current && current.author_id !== user.id) return forbidden("You can only edit your own posts");

    const { data: announcement, error } = await supabase
      .from("announcements")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", annId)
      .eq("team_id", teamId)
      .select()
      .single();

    if (error) throw error;

    // Get author profile separately
    const { data: author } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .eq("id", announcement.author_id)
      .single();

    const formatted = {
      id: announcement.id,
      teamId: announcement.team_id,
      authorId: announcement.author_id,
      authorName: author?.name || announcement.author_name || "Unknown",
      content: announcement.content,
      type: announcement.type,
      pinned: announcement.pinned,
      likes: announcement.likes || [],
      comments: announcement.comments || [],
      pollOptions: announcement.poll_options,
      pollVotes: announcement.poll_votes,
      createdAt: announcement.created_at,
      editedAt: announcement.updated_at,
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
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const { teamId, annId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: current } = await supabase.from("announcements").select("author_id").eq("id", annId).eq("team_id", teamId).maybeSingle();
    if (current && current.author_id !== user.id && !isAdmin(auth.role)) return forbidden("You can only delete your own posts");

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
