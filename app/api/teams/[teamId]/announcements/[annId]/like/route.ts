import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// POST /api/teams/[teamId]/announcements/[annId]/like
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; annId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, annId } = await params;
    const supabase = getSupabaseAdmin();

    // Get current announcement
    const { data: existing, error: fetchError } = await supabase
      .from("announcements")
      .select("likes")
      .eq("id", annId)
      .eq("team_id", teamId)
      .single();

    if (fetchError) throw fetchError;

    const likes: string[] = existing.likes || [];
    const isLiked = likes.includes(user.id);
    const newLikes = isLiked
      ? likes.filter((id: string) => id !== user.id)
      : [...likes, user.id];

    const { data: announcement, error } = await supabase
      .from("announcements")
      .update({ likes: newLikes })
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
    };

    return success({ announcement: formatted });
  } catch (err) {
    console.error("Toggle like error:", err);
    return serverError("Failed to toggle like");
  }
}
