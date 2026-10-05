import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create admin client for server operations
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export type TeamRole = "owner" | "admin" | "member";
export interface AuthUser { id: string; email: string; }

// Verified sessions are cached briefly so each request doesn't round-trip to
// Supabase Auth. Entries never outlive the token's own expiry.
const sessionCache = new Map<string, { user: AuthUser; until: number }>();
const CACHE_MS = 60_000;

/**
 * The signed-in user, verified with Supabase Auth (signature, expiry, revocation).
 * Never trust a decoded-but-unverified JWT: anyone can mint one.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const now = Date.now();
  const hit = sessionCache.get(token);
  if (hit && hit.until > now) return hit.user;

  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data.user) { sessionCache.delete(token); return null; }
    const user = { id: data.user.id, email: data.user.email ?? "" };
    let exp = now + CACHE_MS;
    try { const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()); if (p.exp) exp = Math.min(exp, p.exp * 1000); } catch { /* keep default */ }
    if (sessionCache.size > 500) sessionCache.clear();
    sessionCache.set(token, { user, until: exp });
    return user;
  } catch {
    return null;
  }
}

/** The user's role in a team, or null if they aren't in it. */
export async function getTeamRole(teamId: string, userId: string): Promise<TeamRole | null> {
  const { data } = await getSupabaseAdmin()
    .from("team_members").select("role").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  const r = String(data.role || "member").toLowerCase();
  return r === "owner" || r === "admin" ? r : "member";
}

export const isAdmin = (role: TeamRole) => role === "owner" || role === "admin";

/**
 * Gate for every /api/teams/[teamId]/… handler: verified user + member of that team.
 * Returns a Response to send back when access is denied.
 */
export async function requireTeamMember(
  request: NextRequest,
  params: Promise<{ teamId: string }>
): Promise<{ user: AuthUser; teamId: string; role: TeamRole } | NextResponse> {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  const { teamId } = await params;
  const role = await getTeamRole(teamId, user.id);
  if (!role) return forbidden();
  return { user, teamId, role };
}

// Log activity helper
export async function logActivity(
  teamId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("activities").insert({
      team_id: teamId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata || {},
    });
  } catch (err) {
    console.error("Log activity error:", err);
  }
}

// Helper responses
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "You don't have access to this") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function success(data: unknown) {
  return NextResponse.json(data);
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
