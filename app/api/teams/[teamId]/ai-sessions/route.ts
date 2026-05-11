import { NextRequest } from "next/server";
import {
  getSupabaseAdmin, getAuthUser,
  unauthorized, badRequest, serverError, success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/ai-sessions?agentId=hub
// Returns the most recent session + its messages for a given agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { teamId } = await params;
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) return badRequest("agentId is required.");

  const supabase = getSupabaseAdmin();

  const { data: session } = await supabase
    .from("ai_chat_sessions")
    .select("id, title, created_at")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!session) return success({ session: null, messages: [] });

  const { data: messages, error } = await supabase
    .from("ai_chat_messages")
    .select("role, content")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  if (error) return serverError(error.message);
  return success({ session, messages: messages ?? [] });
}

// POST /api/teams/[teamId]/ai-sessions
// Create a new session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { teamId } = await params;
  const body = await request.json();
  const { agentId, title } = body;
  if (!agentId) return badRequest("agentId is required.");

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("ai_chat_sessions")
    .insert({ team_id: teamId, user_id: user.id, agent_id: agentId, title: title ?? null })
    .select("id, title, created_at")
    .single();

  if (error) return serverError(error.message);
  return success({ session: data });
}
