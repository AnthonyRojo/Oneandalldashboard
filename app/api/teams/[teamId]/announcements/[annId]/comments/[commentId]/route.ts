import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

interface AnnouncementComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  editedAt?: string;
}

// PUT /api/teams/[teamId]/announcements/[annId]/comments/[commentId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; annId: string; commentId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, annId, commentId } = await params;
    const { content } = await request.json();
    const supabase = getSupabaseAdmin();

    // Get current announcement
    const { data: existing, error: fetchError } = await supabase
      .from("announcements")
      .select("comments")
      .eq("id", annId)
      .eq("team_id", teamId)
      .single();

    if (fetchError) throw fetchError;

    const comments: AnnouncementComment[] = existing.comments || [];
    const commentIndex = comments.findIndex((c) => c.id === commentId);
    if (commentIndex !== -1) {
      comments[commentIndex].content = content;
      comments[commentIndex].editedAt = new Date().toISOString();
    }

    const { data: announcement, error } = await supabase
      .from("announcements")
      .update({ comments })
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
      title: announcement.title,
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
    console.error("Update comment error:", err);
    return serverError("Failed to update comment");
  }
}

// DELETE /api/teams/[teamId]/announcements/[annId]/comments/[commentId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; annId: string; commentId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, annId, commentId } = await params;
    const supabase = getSupabaseAdmin();

    // Get current announcement
    const { data: existing, error: fetchError } = await supabase
      .from("announcements")
      .select("comments")
      .eq("id", annId)
      .eq("team_id", teamId)
      .single();

    if (fetchError) throw fetchError;

    const comments: AnnouncementComment[] = (existing.comments || []).filter(
      (c) => c.id !== commentId
    );

    const { data: announcement, error } = await supabase
      .from("announcements")
      .update({ comments })
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
      title: announcement.title,
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
    console.error("Delete comment error:", err);
    return serverError("Failed to delete comment");
  }
}
