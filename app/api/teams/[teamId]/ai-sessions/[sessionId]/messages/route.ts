import { NextRequest } from "next/server";
import {
  getSupabaseAdmin, requireTeamMember,
  unauthorized, badRequest, serverError, success,
} from "@/lib/api-helpers";

// POST /api/teams/[teamId]/ai-sessions/[sessionId]/messages
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; sessionId: string }> }
) {
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const { sessionId } = await params;
  const body = await request.json();
  const { role, content } = body;

  if (!role || !content) return badRequest("role and content are required.");
  if (role !== "user" && role !== "assistant") return badRequest("role must be user or assistant.");

  const supabase = getSupabaseAdmin();

  // Verify this session belongs to the requesting user
  const { data: session } = await supabase
    .from("ai_chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return unauthorized();

  const { error } = await supabase
    .from("ai_chat_messages")
    .insert({ session_id: sessionId, role, content });

  if (error) return serverError(error.message);
  return success({ ok: true });
}
