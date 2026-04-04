import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  logActivity,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// PUT /api/teams/[teamId]/tasks/[taskId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; taskId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, taskId } = await params;
    const updates = await request.json();
    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.assigneeId !== undefined) updateData.assignee_id = updates.assigneeId;
    if (updates.assigneeIds !== undefined) updateData.assignee_id = updates.assigneeIds?.[0] || null;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updateData)
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
      comments: [],
    };

    if (updates.status === "completed") {
      await logActivity(teamId, user.id, "completed task", "task", task.id, {
        title: task.title,
      });
    } else {
      await logActivity(teamId, user.id, "updated task", "task", task.id, {
        title: task.title,
      });
    }

    return success({ task: formatted });
  } catch (err) {
    console.error("Update task error:", err);
    return serverError("Failed to update task");
  }
}

// DELETE /api/teams/[teamId]/tasks/[taskId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; taskId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, taskId } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("team_id", teamId);

    if (error) throw error;
    return success({ success: true });
  } catch (err) {
    console.error("Delete task error:", err);
    return serverError("Failed to delete task");
  }
}
