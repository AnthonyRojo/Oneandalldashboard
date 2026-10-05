import { NextRequest } from "next/server";
import {
  getSupabaseAdmin, requireTeamMember,
  unauthorized, serverError, success,
} from "@/lib/api-helpers";

// DELETE /api/teams/[teamId]/ai-sessions/[sessionId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; sessionId: string }> }
) {
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const { sessionId } = await params;
  const supabase = getSupabaseAdmin();

  // Verify ownership before deleting
  const { data: session } = await supabase
    .from("ai_chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return unauthorized();

  // Messages are deleted via ON DELETE CASCADE on the FK
  const { error } = await supabase
    .from("ai_chat_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) return serverError(error.message);
  return success({ ok: true });
}
