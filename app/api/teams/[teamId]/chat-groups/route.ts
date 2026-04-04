import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/chat-groups
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: groups, error } = await supabase
      .from("chat_groups")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (groups || []).map((g: Record<string, unknown>) => ({
      id: g.id,
      teamId: g.team_id,
      name: g.name,
      memberIds: g.member_ids || [],
      createdBy: g.created_by,
      createdAt: g.created_at,
    }));

    return success({ groups: formatted });
  } catch (err) {
    console.error("Get chat groups error:", err);
    return serverError("Failed to get groups");
  }
}

// POST /api/teams/[teamId]/chat-groups
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const { name, memberIds } = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: group, error } = await supabase
      .from("chat_groups")
      .insert({
        team_id: teamId,
        name: name || "New Group",
        member_ids: memberIds || [],
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: group.id,
      teamId: group.team_id,
      name: group.name,
      memberIds: group.member_ids || [],
      createdBy: group.created_by,
      createdAt: group.created_at,
    };

    return success({ group: formatted });
  } catch (err) {
    console.error("Create chat group error:", err);
    return serverError("Failed to create group");
  }
}
