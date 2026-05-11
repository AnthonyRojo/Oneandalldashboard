import { NextRequest } from "next/server";
import {
  getSupabaseAdmin, getAuthUser,
  unauthorized, serverError, success,
} from "@/lib/api-helpers";

// DELETE /api/teams/[teamId]/knowledge-base/[fileId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; fileId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { teamId, fileId } = await params;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("knowledge_base")
    .delete()
    .eq("id", fileId)
    .eq("team_id", teamId);

  if (error) return serverError(error.message);
  return success({ success: true });
}
