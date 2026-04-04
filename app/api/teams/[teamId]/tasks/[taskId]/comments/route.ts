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

// POST /api/teams/[teamId]/tasks/[taskId]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; taskId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, taskId } = await params;
    const { content } = await request.json();

    if (!content?.trim()) return badRequest("Content is required");

    const supabase = getSupabaseAdmin();

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    // Get current task
    const { data: existing, error: fetchError } = await supabase
      .from("tasks")
      .select("comments")
      .eq("id", taskId)
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

    const { data: task, error } = await supabase
      .from("tasks")
      .update({ comments })
      .eq("id", taskId)
      .eq("team_id", teamId)
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: task.id,
      teamId: task.team_id,
      projectId: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assignee_id,
      assigneeIds: task.assignee_id ? [task.assignee_id] : [],
      dueDate: task.due_date,
      tags: task.tags || [],
      createdAt: task.created_at,
      comments: task.comments || [],
    };

    return success({ task: formatted });
  } catch (err) {
    console.error("Add task comment error:", err);
    return serverError("Failed to add comment");
  }
}
