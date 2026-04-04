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
    if (updates.priority !== undefined) updateData.priority = (updates.priority as string)?.toLowerCase() || "medium";
    
    // Validate and set assignee_id
    if (updates.assigneeId !== undefined) {
      if (updates.assigneeId) {
        const { data: userExists } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", updates.assigneeId)
          .single();
        updateData.assignee_id = userExists ? updates.assigneeId : null;
      } else {
        updateData.assignee_id = null;
      }
    }
    
    // Validate and set assignee_ids (multiple)
    if (updates.assigneeIds !== undefined) {
      if (updates.assigneeIds.length > 0) {
        const { data: validUsers } = await supabase
          .from("profiles")
          .select("id")
          .in("id", updates.assigneeIds);
        const validIds = (validUsers || []).map((u) => u.id);
        updateData.assignee_ids = validIds.length > 0 ? validIds : null;
        updateData.assignee_id = validIds[0] || null;
      } else {
        updateData.assignee_ids = null;
        updateData.assignee_id = null;
      }
    }
    
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null;
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId || null;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.submittedLink !== undefined) updateData.submitted_link = updates.submittedLink || null;
    if (updates.submissionStatus !== undefined) updateData.submission_status = updates.submissionStatus;
    if (updates.approverId !== undefined) {
      if (updates.approverId) {
        const { data: approverExists } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", updates.approverId)
          .single();
        updateData.approver_id = approverExists ? updates.approverId : null;
      } else {
        updateData.approver_id = null;
      }
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("team_id", teamId)
      .select()
      .single();

    if (error) throw error;

    const assigneeIdArray = (task.assignee_ids as string[]) || (task.assignee_id ? [task.assignee_id as string] : []);
    const formatted = {
      id: task.id,
      teamId: task.team_id,
      projectId: task.project_id,
      title: task.title,
      description: task.description,
      status: (task.status as string)?.toLowerCase() || "todo",
      priority: (task.priority as string)?.charAt(0).toUpperCase() + (task.priority as string)?.slice(1).toLowerCase() || "Medium",
      assigneeId: task.assignee_id,
      assigneeIds: assigneeIdArray,
      dueDate: task.due_date,
      tags: task.tags || [],
      submittedLink: task.submitted_link,
      submissionStatus: task.submission_status,
      approverId: task.approver_id,
      createdAt: task.created_at,
      comments: task.comments || [],
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
