import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  requireTeamMember,
  isAdmin,
  forbidden,
  getInitials,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// The client sends either the team_members row id or the member's user id.
async function findMember(teamId: string, memberId: string) {
  const { data } = await getSupabaseAdmin()
    .from("team_members").select("id, user_id, role")
    .eq("team_id", teamId).or(`id.eq.${memberId},user_id.eq.${memberId}`).maybeSingle();
  return data as { id: string; user_id: string; role: string } | null;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PUT /api/teams/[teamId]/members/[memberId] - Update member (role, status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const { teamId, memberId } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    if (!UUID.test(memberId)) return serverError("Member not found");
    const target = await findMember(teamId, memberId);
    if (!target) return serverError("Member not found");
    const isSelf = target.user_id === user.id;

    const updateData: Record<string, string> = {};
    if (body.status) {
      // You can set your own status; owners/admins can set anyone's.
      if (!isSelf && !isAdmin(auth.role)) return forbidden("You can only change your own status");
      updateData.status = String(body.status);
    }
    if (body.role) {
      const role = String(body.role).toLowerCase();
      if (!isAdmin(auth.role)) return forbidden("Only owners and admins can change roles");
      if (isSelf) return forbidden("You can't change your own role");
      if (target.role === "owner") return forbidden("The owner's role can't be changed");
      if (role !== "admin" && role !== "member") return forbidden("Role must be Admin or Member");
      updateData.role = role;
    }

    if (Object.keys(updateData).length === 0) {
      return serverError("No fields to update");
    }

    const { data: membership, error } = await supabase
      .from("team_members")
      .update(updateData)
      .eq("id", target.id)
      .select();

    if (error) throw error;
    if (!membership || membership.length === 0) {
      return serverError("Member not found");
    }

    const memberData = membership[0];

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .eq("id", target.user_id)
      .single();

    const member = {
      id: memberId,
      odid: memberData.id,
      userId: target.user_id,
      teamId,
      name: profile?.name || "Unknown",
      email: profile?.email || "",
      avatar: profile?.avatar_url || getInitials(profile?.name || "U"),
      role: memberData.role === "owner" ? "Owner" : memberData.role === "admin" ? "Admin" : "Member",
      status: memberData.status || "Available",
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
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const { teamId, memberId } = await params;
    const supabase = getSupabaseAdmin();

    if (!UUID.test(memberId)) return serverError("Member not found");
    const target = await findMember(teamId, memberId);
    if (!target) return serverError("Member not found");
    if (target.role === "owner") return forbidden("The owner can't be removed");
    // Owners/admins can remove people; anyone can leave.
    if (target.user_id !== user.id && !isAdmin(auth.role)) return forbidden("Only owners and admins can remove members");

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", target.id);

    if (error) throw error;
    return success({ success: true });
  } catch (err) {
    console.error("Remove member error:", err);
    return serverError("Failed to remove member");
  }
}
