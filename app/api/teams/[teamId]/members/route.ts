import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  getInitials,
  logActivity,
  unauthorized,
  badRequest,
  serverError,
  success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: members, error } = await supabase
      .from("team_members")
      .select("id, team_id, user_id, role, joined_at, status")
      .eq("team_id", teamId);

    if (error) throw error;

    // Get profile info separately
    const userIds = (members || []).map((m) => m.user_id);
    let profilesMap: Record<string, { name: string; email: string; avatar_url: string }> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", userIds);
      
      profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, { name: string; email: string; avatar_url: string }>);
    }

    // Transform to expected format
    const formatted = (members || []).map((m: Record<string, unknown>) => {
      const profile = profilesMap[m.user_id as string];
      return {
        id: m.user_id,
        odid: m.id,
        teamId: m.team_id,
        name: profile?.name || "Unknown",
        email: profile?.email || "",
        avatar: profile?.avatar_url || getInitials((profile?.name as string) || "U"),
        role: m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : "Member",
        status: m.status || "Available",
      };
    });

    return success({ members: formatted });
  } catch (err) {
    console.error("Get members error:", err);
    return serverError("Failed to get members");
  }
}

// POST /api/teams/[teamId]/members - Add a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const { email, role } = await request.json();

    if (!email?.trim()) {
      return badRequest("Email is required");
    }

    const supabase = getSupabaseAdmin();

    // Find user by email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const foundUser = users.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!foundUser) {
      return badRequest("User not found. They must sign up first.");
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", foundUser.id)
      .single();

    if (existing) {
      return badRequest("User is already a team member");
    }

    // Add as member
    const { data: membership, error } = await supabase
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: foundUser.id,
        role: role?.toLowerCase() || "member",
      })
      .select()
      .single();

    if (error) throw error;

    const profile = await supabase
      .from("profiles")
      .select("*")
      .eq("id", foundUser.id)
      .single();

    const member = {
      id: foundUser.id,
      odid: membership.id,
      teamId,
      name: profile.data?.name || foundUser.email?.split("@")[0] || "User",
      email: foundUser.email,
      avatar: profile.data?.avatar_url || getInitials(profile.data?.name || "U"),
      role: role || "Member",
      status: "Available",
    };

    await logActivity(teamId, user.id, "added member", "member", foundUser.id, {
      name: member.name,
    });
    return success({ member });
  } catch (err) {
    console.error("Add member error:", err);
    return serverError("Failed to add member");
  }
}
