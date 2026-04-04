import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// DELETE /api/teams/[teamId]/members/[memberId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, memberId } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", memberId);

    if (error) throw error;
    return success({ success: true });
  } catch (err) {
    console.error("Remove member error:", err);
    return serverError("Failed to remove member");
  }
}
