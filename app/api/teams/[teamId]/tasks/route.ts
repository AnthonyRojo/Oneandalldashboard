import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  logActivity,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assignee:assignee_id (id, name, email, avatar_url)
      `)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (tasks || []).map((t: Record<string, unknown>) => {
      const assignee = t.assignee as Record<string, unknown> | null;
      return {
        id: t.id,
        teamId: t.team_id,
        projectId: t.project_id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assignee_id,
        assigneeIds: t.assignee_id ? [t.assignee_id] : [],
        assigneeName: assignee?.name,
        dueDate: t.due_date,
        tags: t.tags || [],
        createdAt: t.created_at,
        comments: [],
      };
    });

    return success({ tasks: formatted });
  } catch (err) {
    console.error("Get tasks error:", err);
    return serverError("Failed to get tasks");
  }
}

// POST /api/teams/[teamId]/tasks
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

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        team_id: teamId,
        project_id: body.projectId || null,
        title: body.title,
        description: body.description,
        status: body.status || "todo",
        priority: body.priority || "Medium",
        assignee_id: body.assigneeId || body.assigneeIds?.[0] || null,
        due_date: body.dueDate || null,
        tags: body.tags || [],
        created_by: user.id,
      })
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

    await logActivity(teamId, user.id, "created task", "task", task.id, {
      title: task.title,
    });
    return success({ task: formatted });
  } catch (err) {
    console.error("Create task error:", err);
    return serverError("Failed to create task");
  }
}
