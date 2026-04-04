import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  logActivity,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/events
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("team_id", teamId)
      .order("start_time", { ascending: true });

    if (error) throw error;

    const formatted = (events || []).map((e: Record<string, unknown>) => ({
      id: e.id,
      teamId: e.team_id,
      title: e.title,
      description: e.description,
      date: e.date || (e.start_time as string)?.split("T")[0],
      startTime: e.start_time,
      endTime: e.end_time,
      type: e.type || "Meeting",
      link: e.link,
      location: e.location,
      color: e.color,
      createdAt: e.created_at,
    }));

    return success({ events: formatted });
  } catch (err) {
    console.error("Get events error:", err);
    return serverError("Failed to get events");
  }
}

// POST /api/teams/[teamId]/events
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

    // Parse dates - handle various formats
    const startTime = body.startTime || body.start || body.date;
    const endTime = body.endTime || body.end || startTime;
    
    const { data: event, error } = await supabase
      .from("events")
      .insert({
        team_id: teamId,
        title: body.title,
        description: body.description,
        date: body.date ? new Date(body.date).toISOString().split("T")[0] : (startTime ? new Date(startTime).toISOString().split("T")[0] : null),
        start_time: startTime,
        end_time: endTime,
        type: body.type || "Meeting",
        link: body.link,
        location: body.location,
        color: body.color || "#3b82f6",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: event.id,
      teamId: event.team_id,
      title: event.title,
      description: event.description,
      date: event.date || event.start_time?.split("T")[0],
      startTime: event.start_time,
      endTime: event.end_time,
      type: event.type,
      link: event.link,
      location: event.location,
      color: event.color,
      createdAt: event.created_at,
    };

    await logActivity(teamId, user.id, "created event", "event", event.id, {
      title: event.title,
    });
    return success({ event: formatted });
  } catch (err) {
    console.error("Create event error:", err);
    return serverError("Failed to create event");
  }
}
