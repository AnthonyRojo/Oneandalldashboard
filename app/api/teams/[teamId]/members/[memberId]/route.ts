import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  getInitials,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// PUT /api/teams/[teamId]/members/[memberId] - Update member (role, status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId, memberId } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const updateData: Record<string, string> = {};
    if (body.role) updateData.role = body.role.toLowerCase();
    if (body.status) updateData.status = body.status;

    const { data: membership, error } = await supabase
      .from("team_members")
      .update(updateData)
      .eq("team_id", teamId)
      .eq("user_id", memberId)
      .select()
      .single();

    if (error) throw error;

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .eq("id", memberId)
      .single();

    const member = {
      id: memberId,
      odid: membership.id,
      teamId,
      name: profile?.name || "Unknown",
      email: profile?.email || "",
      avatar: profile?.avatar_url || getInitials(profile?.name || "U"),
      role: membership.role === "owner" ? "Owner" : membership.role === "admin" ? "Admin" : "Member",
      status: membership.status || "Available",
    };

    return success({ member });
  } catch (err) {
    console.error("Update member error:", err);
    return serverError("Failed to update member");
  }
}

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
