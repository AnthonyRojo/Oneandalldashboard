import { NextRequest } from "next/server";
import {
  getSupabaseAdmin,
  getAuthUser,
  unauthorized,
  serverError,
  success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/activities
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const { teamId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: activities, error } = await supabase
      .from("activities")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Get user profiles separately
    const userIds = [...new Set((activities || []).map((a) => a.user_id).filter(Boolean))];
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

    const formatted = (activities || []).map((a: Record<string, unknown>) => {
      const actUser = profilesMap[a.user_id as string];
      const metadata = a.metadata as Record<string, unknown> | null;
      return {
        id: a.id,
        teamId: a.team_id,
        userId: a.user_id,
        userName: actUser?.name || "Unknown",
        action: a.action,
        target: metadata?.title || metadata?.name || a.entity_type,
        type: a.entity_type,
        createdAt: a.created_at,
      };
    });

    return success({ activities: formatted });
  } catch (err) {
    console.error("Get activities error:", err);
    return serverError("Failed to get activities");
  }
}
