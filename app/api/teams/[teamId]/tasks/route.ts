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
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get assignee info separately
    const assigneeIds = [...new Set((tasks || []).map((t) => t.assignee_id).filter(Boolean))];
    let profilesMap: Record<string, { name: string; email: string; avatar_url: string }> = {};
    
    if (assigneeIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", assigneeIds);
      
      profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, { name: string; email: string; avatar_url: string }>);
    }

    const formatted = (tasks || []).map((t: Record<string, unknown>) => {
      const assigneeIdArray = (t.assignee_ids as string[]) || (t.assignee_id ? [t.assignee_id as string] : []);
      const assigneeNames = assigneeIdArray
        .map((id) => profilesMap[id]?.name)
        .filter(Boolean)
        .join(", ");

      return {
        id: t.id,
        teamId: t.team_id,
        projectId: t.project_id,
        title: t.title,
        description: t.description,
        status: (t.status as string)?.toLowerCase() || "todo",
        priority: t.priority,
        assigneeId: t.assignee_id,
        assigneeIds: assigneeIdArray,
        assigneeName: assigneeNames || "",
        dueDate: t.due_date,
        tags: t.tags || [],
        createdAt: t.created_at,
        comments: t.comments || [],
        submissionStatus: t.submission_status || "none",
        submittedLink: t.submitted_link || "",
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

    // Support multiple assignees
    const assigneeIds = body.assigneeIds && body.assigneeIds.length > 0 ? body.assigneeIds : (body.assigneeId ? [body.assigneeId] : []);
    
    // Validate assignees exist if provided
    let validAssigneeIds = assigneeIds;
    if (assigneeIds.length > 0) {
      const { data: assignees } = await supabase
        .from("profiles")
        .select("id")
        .in("id", assigneeIds);
      
      validAssigneeIds = (assignees || []).map((a) => a.id);
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        team_id: teamId,
        project_id: body.projectId || null,
        title: body.title,
        description: body.description,
        status: body.status || "todo",
        priority: (body.priority || "Medium").toLowerCase(),
        assignee_id: validAssigneeIds[0] || null,
        assignee_ids: validAssigneeIds.length > 0 ? validAssigneeIds : null,
        due_date: body.dueDate || null,
        tags: body.tags || [],
        created_by: user.id,
      })
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
      status: task.status,
      priority: task.priority,
      assigneeId: task.assignee_id,
      assigneeIds: assigneeIdArray,
      dueDate: task.due_date,
      tags: task.tags || [],
      createdAt: task.created_at,
      comments: [],
      submissionStatus: task.submission_status || "none",
      submittedLink: task.submitted_link || "",
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
