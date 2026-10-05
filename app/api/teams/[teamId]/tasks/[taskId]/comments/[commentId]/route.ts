import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  requireTeamMember, isAdmin, forbidden,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  editedAt?: string;
}

// PUT /api/teams/[teamId]/tasks/[taskId]/comments/[commentId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; taskId: string; commentId: string }> }
) {
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const { teamId, taskId, commentId } = await params;
    const { content } = await request.json();
    const supabase = getSupabaseAdmin();

    // Get current task
    const { data: existing, error: fetchError } = await supabase
      .from("tasks")
      .select("comments")
      .eq("id", taskId)
      .eq("team_id", teamId)
      .single();

    if (fetchError) throw fetchError;

    const comments: TaskComment[] = existing.comments || [];
    const commentIndex = comments.findIndex((c) => c.id === commentId);
    if (commentIndex !== -1 && comments[commentIndex].authorId !== user.id) return forbidden("You can only edit your own comments");
    if (commentIndex !== -1) {
      comments[commentIndex].content = content;
      comments[commentIndex].editedAt = new Date().toISOString();
    }

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
    console.error("Update task comment error:", err);
    return serverError("Failed to update comment");
  }
}

// DELETE /api/teams/[teamId]/tasks/[taskId]/comments/[commentId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; taskId: string; commentId: string }> }
) {
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const { teamId, taskId, commentId } = await params;
    const supabase = getSupabaseAdmin();

    // Get current task
    const { data: existing, error: fetchError } = await supabase
      .from("tasks")
      .select("comments")
      .eq("id", taskId)
      .eq("team_id", teamId)
      .single();

    if (fetchError) throw fetchError;

    const target = (existing.comments || []).find((c: TaskComment) => c.id === commentId) as TaskComment | undefined;
    if (target && target.authorId !== user.id && !isAdmin(auth.role)) return forbidden("You can only delete your own comments");
    const comments: TaskComment[] = (existing.comments || []).filter(
      (c: TaskComment) => c.id !== commentId
    );

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
    console.error("Delete task comment error:", err);
    return serverError("Failed to delete comment");
  }
}
