import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  logActivity,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/projects
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (projects || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      teamId: p.team_id,
      name: p.name,
      description: p.description,
      status: p.status,
      color: p.color,
      progress: p.progress || 0,
      createdAt: p.created_at,
    }));

    return success({ projects: formatted });
  } catch (err) {
    console.error("Get projects error:", err);
    return serverError("Failed to get projects");
  }
}

// POST /api/teams/[teamId]/projects
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

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        team_id: teamId,
        name: body.name,
        description: body.description,
        status: body.status || "active",
        color: body.color || "#3b82f6",
        progress: body.progress || 0,
        created_by: user.id,
      })
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
      createdAt: project.created_at,
    };

    await logActivity(teamId, user.id, "created project", "project", project.id, {
      name: project.name,
    });
    return success({ project: formatted });
  } catch (err) {
    console.error("Create project error:", err);
    return serverError("Failed to create project");
  }
}
