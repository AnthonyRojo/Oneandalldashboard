import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  logActivity,
  unauthorized,
  badRequest,
  serverError,
  success,
} from "@/lib/api-helpers";

// GET /api/teams - Get user's teams
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const supabase = getSupabaseAdmin();

    // Get teams where user is a member
    const { data: memberships, error: memberError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id);

    if (memberError) throw memberError;
    if (!memberships || memberships.length === 0) {
      return success({ teams: [] });
    }

    const teamIds = memberships.map((m) => m.team_id);
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*")
      .in("id", teamIds);

    if (teamsError) throw teamsError;
    return success({ teams: teams || [] });
  } catch (err) {
    console.error("Get teams error:", err);
    return serverError("Failed to get teams");
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { name, color } = await request.json();
    if (!name?.trim()) return badRequest("Team name is required");

    const supabase = getSupabaseAdmin();

    // Create team
    const { data: team, error } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        color: color || "#f59e0b",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as owner
    await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "owner",
    });

    await logActivity(team.id, user.id, "created team", "team", team.id, { name: team.name });
    return success({ team });
  } catch (err) {
    console.error("Create team error:", err);
    return serverError("Failed to create team");
  }
}
