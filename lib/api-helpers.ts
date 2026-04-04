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

// Decode JWT to get user info
function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Get authenticated user from request
export function getAuthUser(request: NextRequest): { id: string; email: string } | null {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    const payload = decodeJWT(token);
    if (!payload || !payload.sub) return null;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && (payload.exp as number) < now) return null;

    return {
      id: payload.sub as string,
      email: (payload.email ?? "") as string,
    };
  } catch {
    return null;
  }
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
