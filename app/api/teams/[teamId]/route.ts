import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// PUT /api/teams/[teamId] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const updates = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: team, error } = await supabase
      .from("teams")
      .update({ name: updates.name, color: updates.color })
      .eq("id", teamId)
      .select()
      .single();

    if (error) throw error;
    return success({ team });
  } catch (err) {
    console.error("Update team error:", err);
    return serverError("Failed to update team");
  }
}
