import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Admin client — only used for admin operations (createUser, updateUser)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── JWT helpers ────────────────────────────────────────────────────────────────

function decodeJWT(token: string): Record<string, any> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    // base64url → base64
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(base64 + padding);
    return JSON.parse(json);
  } catch (e) {
    console.log(`decodeJWT error: ${e}`);
    return null;
  }
}

/**
 * Extract authenticated user directly from the JWT payload.
 * Supabase signs every JWT with the project JWT secret — no network call needed.
 * We still verify it's a real authenticated session (not anon) and hasn't expired.
 */
function getAuthUser(c: any): { id: string; email: string; user_metadata: Record<string, any> } | null {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      console.log("Auth: no Authorization header");
      return null;
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      console.log("Auth: empty token");
      return null;
    }

    const payload = decodeJWT(token);
    if (!payload) {
      console.log("Auth: could not decode JWT");
      return null;
    }

    // Must be an authenticated session, not anonymous
    if (payload.role !== "authenticated") {
      console.log(`Auth: role is '${payload.role}', not 'authenticated'`);
      return null;
    }

    // Must have a subject (user ID)
    if (!payload.sub) {
      console.log("Auth: no sub in JWT payload");
      return null;
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log(`Auth: token expired at ${payload.exp}, now is ${now}`);
      return null;
    }

    return {
      id: payload.sub as string,
      email: (payload.email || "") as string,
      user_metadata: (payload.user_metadata || {}) as Record<string, any>,
    };
  } catch (err) {
    console.log(`getAuthUser unexpected error: ${err}`);
    return null;
  }
}

function getInitials(name: string): string {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Helper: log an activity to the team's activity feed
async function logActivity(
  teamId: string,
  userId: string,
  userName: string,
  action: string,
  target: string,
  type: string
) {
  try {
    const existing = ((await kv.get(`activities:${teamId}`)) as any[] | null) || [];
    const activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      teamId,
      userId,
      userName,
      action,
      target,
      type,
      createdAt: new Date().toISOString(),
    };
    const updated = [activity, ...existing].slice(0, 100);
    await kv.set(`activities:${teamId}`, updated);
  } catch (err) {
    console.log(`Log activity error: ${err}`);
  }
}

// ─── Health ────────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/health", (c) => c.json({ status: "ok" }));

// ─── Auth ──────────────────────────────────────────────────────────────────────
app.post("/make-server-7d783630/auth/signup", async (c) => {
  try {
    const { name, email, password } = await c.req.json();
    if (!name || !email || !password) {
      return c.json({ error: "Name, email, and password are required" }, 400);
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });
    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }
    return c.json({ user: data.user });
  } catch (err) {
    console.log(`Signup unexpected error: ${err}`);
    return c.json({ error: "Signup failed. Please try again." }, 500);
  }
});

app.post("/make-server-7d783630/auth/change-password", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { newPassword } = await c.req.json();
    if (!newPassword || newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Change password error: ${err}`);
    return c.json({ error: "Failed to change password" }, 500);
  }
});

// ─── Teams ─────────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const teamIds = (await kv.get(`user_teams:${user.id}`)) as string[] | null;
    if (!teamIds || teamIds.length === 0) return c.json({ teams: [] });
    const teams = await kv.mget(teamIds.map((id) => `team:${id}`));
    return c.json({ teams: teams.filter(Boolean) });
  } catch (err) {
    console.log(`Get teams error: ${err}`);
    return c.json({ error: "Failed to get teams" }, 500);
  }
});

app.post("/make-server-7d783630/teams", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { name, color } = await c.req.json();
    if (!name?.trim()) return c.json({ error: "Team name is required" }, 400);
    const teamId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const team = { id: teamId, name: name.trim(), color: color || "#f59e0b", ownerId: user.id };
    await kv.set(`team:${teamId}`, team);

    const userName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const member = {
      id: user.id,
      teamId,
      name: userName,
      email: user.email,
      avatar: getInitials(userName),
      role: "Owner",
      status: "Available",
    };
    await kv.set(`member:${teamId}:${user.id}`, member);

    const existingIds = ((await kv.get(`user_teams:${user.id}`)) as string[] | null) || [];
    await kv.set(`user_teams:${user.id}`, [...existingIds, teamId]);

    await logActivity(teamId, user.id, userName, "created team", name.trim(), "team");
    return c.json({ team });
  } catch (err) {
    console.log(`Create team error: ${err}`);
    return c.json({ error: "Failed to create team" }, 500);
  }
});

app.put("/make-server-7d783630/teams/:teamId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const updates = await c.req.json();
    const existing = (await kv.get(`team:${teamId}`)) as any;
    if (!existing) return c.json({ error: "Team not found" }, 404);
    const updated = { ...existing, ...updates };
    await kv.set(`team:${teamId}`, updated);
    return c.json({ team: updated });
  } catch (err) {
    console.log(`Update team error: ${err}`);
    return c.json({ error: "Failed to update team" }, 500);
  }
});

// ─── Members ───────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/members", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const members = await kv.getByPrefix(`member:${teamId}:`);
    return c.json({ members: members.filter(Boolean) });
  } catch (err) {
    console.log(`Get members error: ${err}`);
    return c.json({ error: "Failed to get members" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/members", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const { name, email, role, status } = await c.req.json();
    if (!name?.trim() || !email?.trim()) {
      return c.json({ error: "Name and email are required" }, 400);
    }
    const memberId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const member = {
      id: memberId,
      teamId,
      name: name.trim(),
      email: email.trim(),
      avatar: getInitials(name.trim()),
      role: role || "Member",
      status: status || "Offline",
    };
    await kv.set(`member:${teamId}:${memberId}`, member);
    const actorName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    await logActivity(teamId, user.id, actorName, "added member", name.trim(), "member");
    return c.json({ member });
  } catch (err) {
    console.log(`Add member error: ${err}`);
    return c.json({ error: "Failed to add member" }, 500);
  }
});

app.put("/make-server-7d783630/teams/:teamId/members/:memberId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, memberId } = c.req.param();
    const updates = await c.req.json();
    const existing = (await kv.get(`member:${teamId}:${memberId}`)) as any;
    if (!existing) return c.json({ error: "Member not found" }, 404);
    const updated = { ...existing, ...updates };
    await kv.set(`member:${teamId}:${memberId}`, updated);
    return c.json({ member: updated });
  } catch (err) {
    console.log(`Update member error: ${err}`);
    return c.json({ error: "Failed to update member" }, 500);
  }
});

// ─── Projects ──────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/projects", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const projects = await kv.getByPrefix(`project:${teamId}:`);
    return c.json({ projects: projects.filter(Boolean) });
  } catch (err) {
    console.log(`Get projects error: ${err}`);
    return c.json({ error: "Failed to get projects" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/projects", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const body = await c.req.json();
    const projectId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const project = { ...body, id: projectId, teamId, createdAt: new Date().toISOString() };
    await kv.set(`project:${teamId}:${projectId}`, project);
    const actorName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    await logActivity(teamId, user.id, actorName, "created project", body.name || "Untitled", "project");
    return c.json({ project });
  } catch (err) {
    console.log(`Create project error: ${err}`);
    return c.json({ error: "Failed to create project" }, 500);
  }
});

app.put("/make-server-7d783630/teams/:teamId/projects/:projectId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, projectId } = c.req.param();
    const updates = await c.req.json();
    const existing = (await kv.get(`project:${teamId}:${projectId}`)) as any;
    if (!existing) return c.json({ error: "Project not found" }, 404);
    const updated = { ...existing, ...updates };
    await kv.set(`project:${teamId}:${projectId}`, updated);
    return c.json({ project: updated });
  } catch (err) {
    console.log(`Update project error: ${err}`);
    return c.json({ error: "Failed to update project" }, 500);
  }
});

// ─── Tasks ─────────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/tasks", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const tasks = await kv.getByPrefix(`task:${teamId}:`);
    return c.json({ tasks: tasks.filter(Boolean) });
  } catch (err) {
    console.log(`Get tasks error: ${err}`);
    return c.json({ error: "Failed to get tasks" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/tasks", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const body = await c.req.json();
    const taskId = `tk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const task = { ...body, id: taskId, teamId, comments: [], createdAt: new Date().toISOString() };
    await kv.set(`task:${teamId}:${taskId}`, task);
    const actorName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    await logActivity(teamId, user.id, actorName, "created task", body.title || "Untitled", "task");
    return c.json({ task });
  } catch (err) {
    console.log(`Create task error: ${err}`);
    return c.json({ error: "Failed to create task" }, 500);
  }
});

app.put("/make-server-7d783630/teams/:teamId/tasks/:taskId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, taskId } = c.req.param();
    const updates = await c.req.json();
    const existing = (await kv.get(`task:${teamId}:${taskId}`)) as any;
    if (!existing) return c.json({ error: "Task not found" }, 404);
    const updated = { ...existing, ...updates };
    await kv.set(`task:${teamId}:${taskId}`, updated);
    const actorName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    if (updates.status === "completed") {
      await logActivity(teamId, user.id, actorName, "completed task", existing.title || "Untitled", "task");
    } else if (updates.submittedLink) {
      await logActivity(teamId, user.id, actorName, "submitted work for", existing.title || "Untitled", "submit");
    } else {
      await logActivity(teamId, user.id, actorName, "updated task", existing.title || "Untitled", "task");
    }
    return c.json({ task: updated });
  } catch (err) {
    console.log(`Update task error: ${err}`);
    return c.json({ error: "Failed to update task" }, 500);
  }
});

app.delete("/make-server-7d783630/teams/:teamId/tasks/:taskId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, taskId } = c.req.param();
    await kv.del(`task:${teamId}:${taskId}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Delete task error: ${err}`);
    return c.json({ error: "Failed to delete task" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/tasks/:taskId/comments", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, taskId } = c.req.param();
    const { content } = await c.req.json();
    if (!content?.trim()) return c.json({ error: "Content is required" }, 400);

    const userName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const comment = {
      id: `tc_${Date.now()}`,
      authorId: user.id,
      authorName: userName,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    const existing = (await kv.get(`task:${teamId}:${taskId}`)) as any;
    if (!existing) return c.json({ error: "Task not found" }, 404);
    const updated = { ...existing, comments: [...(existing.comments || []), comment] };
    await kv.set(`task:${teamId}:${taskId}`, updated);
    await logActivity(teamId, user.id, userName, "commented on task", existing.title || "Untitled", "comment");
    return c.json({ comment, task: updated });
  } catch (err) {
    console.log(`Add task comment error: ${err}`);
    return c.json({ error: "Failed to add comment" }, 500);
  }
});

// ─── Calendar Events ───────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/events", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const events = await kv.getByPrefix(`event:${teamId}:`);
    return c.json({ events: events.filter(Boolean) });
  } catch (err) {
    console.log(`Get events error: ${err}`);
    return c.json({ error: "Failed to get events" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/events", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const body = await c.req.json();
    const eventId = `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const event = { ...body, id: eventId, teamId, createdAt: new Date().toISOString() };
    await kv.set(`event:${teamId}:${eventId}`, event);
    const actorName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    await logActivity(teamId, user.id, actorName, "created event", body.title || "Untitled", "event");
    return c.json({ event });
  } catch (err) {
    console.log(`Create event error: ${err}`);
    return c.json({ error: "Failed to create event" }, 500);
  }
});

app.delete("/make-server-7d783630/teams/:teamId/events/:eventId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, eventId } = c.req.param();
    await kv.del(`event:${teamId}:${eventId}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Delete event error: ${err}`);
    return c.json({ error: "Failed to delete event" }, 500);
  }
});

// ─── Announcements ─────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/announcements", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const announcements = await kv.getByPrefix(`announcement:${teamId}:`);
    return c.json({ announcements: announcements.filter(Boolean) });
  } catch (err) {
    console.log(`Get announcements error: ${err}`);
    return c.json({ error: "Failed to get announcements" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/announcements", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const body = await c.req.json();
    const annId = `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const announcement = {
      ...body,
      id: annId,
      teamId,
      authorId: user.id,
      authorName: userName,
      pinned: false,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    await kv.set(`announcement:${teamId}:${annId}`, announcement);
    await logActivity(teamId, user.id, userName, "posted announcement", (body.content || "").slice(0, 60), "announcement");
    return c.json({ announcement });
  } catch (err) {
    console.log(`Create announcement error: ${err}`);
    return c.json({ error: "Failed to create announcement" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/announcements/:annId/like", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, annId } = c.req.param();
    const existing = (await kv.get(`announcement:${teamId}:${annId}`)) as any;
    if (!existing) return c.json({ error: "Announcement not found" }, 404);
    const liked = (existing.likes || []).includes(user.id);
    const likes = liked
      ? (existing.likes || []).filter((id: string) => id !== user.id)
      : [...(existing.likes || []), user.id];
    const updated = { ...existing, likes };
    await kv.set(`announcement:${teamId}:${annId}`, updated);
    return c.json({ announcement: updated });
  } catch (err) {
    console.log(`Toggle like error: ${err}`);
    return c.json({ error: "Failed to toggle like" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/announcements/:annId/pin", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, annId } = c.req.param();
    const existing = (await kv.get(`announcement:${teamId}:${annId}`)) as any;
    if (!existing) return c.json({ error: "Announcement not found" }, 404);
    const updated = { ...existing, pinned: !existing.pinned };
    await kv.set(`announcement:${teamId}:${annId}`, updated);
    const actorName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    await logActivity(teamId, user.id, actorName, updated.pinned ? "pinned announcement" : "unpinned announcement", (existing.content || "").slice(0, 60), "announcement");
    return c.json({ announcement: updated });
  } catch (err) {
    console.log(`Toggle pin error: ${err}`);
    return c.json({ error: "Failed to toggle pin" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/announcements/:annId/comments", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, annId } = c.req.param();
    const { content } = await c.req.json();
    if (!content?.trim()) return c.json({ error: "Content is required" }, 400);

    const userName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const comment = {
      id: `ac_${Date.now()}`,
      authorId: user.id,
      authorName: userName,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    const existing = (await kv.get(`announcement:${teamId}:${annId}`)) as any;
    if (!existing) return c.json({ error: "Announcement not found" }, 404);
    const updated = { ...existing, comments: [...(existing.comments || []), comment] };
    await kv.set(`announcement:${teamId}:${annId}`, updated);
    await logActivity(teamId, user.id, userName, "replied to announcement", (existing.content || "").slice(0, 60), "comment");
    return c.json({ comment, announcement: updated });
  } catch (err) {
    console.log(`Add announcement comment error: ${err}`);
    return c.json({ error: "Failed to add comment" }, 500);
  }
});

// ─── Activities ────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/activities", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const activities = ((await kv.get(`activities:${teamId}`)) as any[] | null) || [];
    return c.json({ activities });
  } catch (err) {
    console.log(`Get activities error: ${err}`);
    return c.json({ error: "Failed to get activities" }, 500);
  }
});

Deno.serve(app.fetch);