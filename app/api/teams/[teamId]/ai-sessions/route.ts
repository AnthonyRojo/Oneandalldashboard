import { NextRequest } from "next/server";
import {
  getSupabaseAdmin, getAuthUser,
  unauthorized, badRequest, serverError, success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/ai-sessions?agentId=hub
//   → latest session + messages (for restore on load)
// GET /api/teams/[teamId]/ai-sessions?agentId=hub&mode=list
//   → last 10 sessions without messages (for sidebar history)
// GET /api/teams/[teamId]/ai-sessions?sessionId=xxx
//   → specific session + its messages (for clicking a past session)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { teamId } = await params;
  const { searchParams } = request.nextUrl;
  const agentId = searchParams.get("agentId");
  const mode = searchParams.get("mode");
  const sessionId = searchParams.get("sessionId");

  const supabase = getSupabaseAdmin();

  // Load a specific session by ID
  if (sessionId) {
    const { data: session } = await supabase
      .from("ai_chat_sessions")
      .select("id, title, agent_id, created_at")
      .eq("id", sessionId)
      .eq("user_id", user.id)
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

  if (!agentId) return badRequest("agentId or sessionId is required.");

  // List mode — return recent sessions without messages
  if (mode === "list") {
    const { data, error } = await supabase
      .from("ai_chat_sessions")
      .select("id, title, updated_at")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .eq("agent_id", agentId)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) return serverError(error.message);
    return success({ sessions: data ?? [] });
  }

  // Default — latest session + messages (restore on load)
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

// POST /api/teams/[teamId]/ai-sessions — create new session
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
