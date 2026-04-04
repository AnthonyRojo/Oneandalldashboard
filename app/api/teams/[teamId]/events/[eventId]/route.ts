import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// PUT /api/teams/[teamId]/events/[eventId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; eventId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, eventId } = await params;
    const updates = await request.json();
    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.start !== undefined) updateData.start_time = updates.start;
    if (updates.end !== undefined) updateData.end_time = updates.end;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.color !== undefined) updateData.color = updates.color;

    const { data: event, error } = await supabase
      .from("events")
      .update(updateData)
      .eq("id", eventId)
      .eq("team_id", teamId)
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
      location: event.location,
      color: event.color,
      createdAt: event.created_at,
    };

    return success({ event: formatted });
  } catch (err) {
    console.error("Update event error:", err);
    return serverError("Failed to update event");
  }
}

// DELETE /api/teams/[teamId]/events/[eventId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; eventId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, eventId } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("team_id", teamId);

    if (error) throw error;
    return success({ success: true });
  } catch (err) {
    console.error("Delete event error:", err);
    return serverError("Failed to delete event");
  }
}
