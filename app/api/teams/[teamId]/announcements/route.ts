import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  logActivity,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/announcements
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: announcements, error } = await supabase
      .from("announcements")
      .select(`
        *,
        author:created_by (id, name, email, avatar_url)
      `)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (announcements || []).map((a: Record<string, unknown>) => {
      const author = a.author as Record<string, unknown> | null;
      return {
        id: a.id,
        teamId: a.team_id,
        authorId: a.created_by,
        authorName: author?.name || "Unknown",
        content: a.content,
        type: a.type || "update",
        pinned: a.pinned || false,
        priority: a.priority,
        likes: a.likes || [],
        comments: a.comments || [],
        pollOptions: a.poll_options,
        pollVotes: a.poll_votes,
        attachedProject: a.attached_project,
        createdAt: a.created_at,
        editedAt: a.edited_at,
      };
    });

    return success({ announcements: formatted });
  } catch (err) {
    console.error("Get announcements error:", err);
    return serverError("Failed to get announcements");
  }
}

// POST /api/teams/[teamId]/announcements
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // Get user profile for authorName
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const { data: announcement, error } = await supabase
      .from("announcements")
      .insert({
        team_id: teamId,
        content: body.content,
        type: body.type || "update",
        pinned: false,
        likes: [],
        comments: [],
        poll_options: body.pollOptions,
        poll_votes: body.pollVotes || {},
        attached_project: body.attachedProject,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: announcement.id,
      teamId: announcement.team_id,
      authorId: announcement.created_by,
      authorName: profile?.name || "Unknown",
      content: announcement.content,
      type: announcement.type,
      pinned: announcement.pinned,
      likes: announcement.likes || [],
      comments: announcement.comments || [],
      pollOptions: announcement.poll_options,
      pollVotes: announcement.poll_votes,
      attachedProject: announcement.attached_project,
      createdAt: announcement.created_at,
    };

    await logActivity(teamId, user.id, "posted announcement", "announcement", announcement.id);
    return success({ announcement: formatted });
  } catch (err) {
    console.error("Create announcement error:", err);
    return serverError("Failed to create announcement");
  }
}
