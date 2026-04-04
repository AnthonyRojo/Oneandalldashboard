import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  logActivity,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// PUT /api/teams/[teamId]/projects/[projectId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; projectId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, projectId } = await params;
    const updates = await request.json();
    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;

    const { data: project, error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId)
      .eq("team_id", teamId)
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: project.id,
      teamId: project.team_id,
      name: project.name,
      description: project.description,
      status: project.status,
      color: project.color,
      progress: project.progress || 0,
      dueDate: project.due_date,
      createdAt: project.created_at,
    };

    return success({ project: formatted });
  } catch (err) {
    console.error("Update project error:", err);
    return serverError("Failed to update project");
  }
}

// DELETE /api/teams/[teamId]/projects/[projectId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; projectId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, projectId } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("team_id", teamId);

    if (error) throw error;

    await logActivity(teamId, user.id, "deleted project", "project", projectId);
    return success({ success: true });
  } catch (err) {
    console.error("Delete project error:", err);
    return serverError("Failed to delete project");
  }
}
