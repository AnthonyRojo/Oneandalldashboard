import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  badRequest,
  serverError,
  success,
} from "@/lib/api-helpers";

// POST /api/teams/[teamId]/announcements/[annId]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; annId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, annId } = await params;
    const { content } = await request.json();

    if (!content?.trim()) return badRequest("Content is required");

    const supabase = getSupabaseAdmin();

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    // Get current announcement
    const { data: existing, error: fetchError } = await supabase
      .from("announcements")
      .select("comments")
      .eq("id", annId)
      .eq("team_id", teamId)
      .single();

    if (fetchError) throw fetchError;

    const comments = existing.comments || [];
    const newComment = {
      id: uuidv4(),
      authorId: user.id,
      authorName: profile?.name || "Unknown",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    comments.push(newComment);

    const { data: announcement, error } = await supabase
      .from("announcements")
      .update({ comments })
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
    console.error("Add comment error:", err);
    return serverError("Failed to add comment");
  }
}
