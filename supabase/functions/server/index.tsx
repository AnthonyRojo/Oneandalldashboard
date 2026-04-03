import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "x-user-token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Admin client for auth operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── JWT helpers ────────────────────────────────────────────────────────────────

function decodeJWT(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(json);
  } catch (e) {
    console.log(`decodeJWT error: ${e}`);
    return null;
  }
}

function getAuthUser(c: any): { id: string; email: string; user_metadata: Record<string, any> } | null {
  try {
    const token = c.req.header("x-user-token");
    if (!token) return null;

    const payload = decodeJWT(token);
    if (!payload || !payload.sub) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return {
      id: payload.sub as string,
      email: (payload.email ?? "") as string,
      user_metadata: (payload.user_metadata ?? {}) as Record<string, any>,
    };
  } catch (err) {
    console.log(`getAuthUser error: ${err}`);
    return null;
  }
}

function getInitials(name: string): string {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Helper: log an activity
async function logActivity(
  teamId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabaseAdmin.from("activities").insert({
      team_id: teamId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata || {},
    });
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
  const user = getAuthUser(c);
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
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    // Get teams where user is a member
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id);

    if (memberError) throw memberError;
    if (!memberships || memberships.length === 0) return c.json({ teams: [] });

    const teamIds = memberships.map((m) => m.team_id);
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from("teams")
      .select("*")
      .in("id", teamIds);

    if (teamsError) throw teamsError;
    return c.json({ teams: teams || [] });
  } catch (err) {
    console.log(`Get teams error: ${err}`);
    return c.json({ error: "Failed to get teams" }, 500);
  }
});

app.post("/make-server-7d783630/teams", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { name, color } = await c.req.json();
    if (!name?.trim()) return c.json({ error: "Team name is required" }, 400);

    // Create team (trigger will auto-add creator as owner)
    const { data: team, error } = await supabaseAdmin
      .from("teams")
      .insert({
        name: name.trim(),
        color: color || "#f59e0b",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(team.id, user.id, "created team", "team", team.id, { name: team.name });
    return c.json({ team });
  } catch (err) {
    console.log(`Create team error: ${err}`);
    return c.json({ error: "Failed to create team" }, 500);
  }
});

app.put("/make-server-7d783630/teams/:teamId", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const updates = await c.req.json();

    const { data: team, error } = await supabaseAdmin
      .from("teams")
      .update({ name: updates.name, color: updates.color })
      .eq("id", teamId)
      .select()
      .single();

    if (error) throw error;
    return c.json({ team });
  } catch (err) {
    console.log(`Update team error: ${err}`);
    return c.json({ error: "Failed to update team" }, 500);
  }
});

// ─── Members ───────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/members", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();

    const { data: members, error } = await supabaseAdmin
      .from("team_members")
      .select(`
        id,
        team_id,
        user_id,
        role,
        joined_at,
        profiles:user_id (id, name, email, avatar_url)
      `)
      .eq("team_id", teamId);

    if (error) throw error;

    // Transform to expected format
    const formatted = (members || []).map((m: any) => ({
      id: m.user_id,
      odid: m.id,
      teamId: m.team_id,
      name: m.profiles?.name || "Unknown",
      email: m.profiles?.email || "",
      avatar: m.profiles?.avatar_url || getInitials(m.profiles?.name || "U"),
      role: m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : "Member",
      status: "Available",
    }));

    return c.json({ members: formatted });
  } catch (err) {
    console.log(`Get members error: ${err}`);
    return c.json({ error: "Failed to get members" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/members", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const { email, role } = await c.req.json();

    if (!email?.trim()) {
      return c.json({ error: "Email is required" }, 400);
    }

    // Find user by email
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const foundUser = users.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!foundUser) {
      return c.json({ error: "User not found. They must sign up first." }, 404);
    }

    // Check if already a member
    const { data: existing } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", foundUser.id)
      .single();

    if (existing) {
      return c.json({ error: "User is already a team member" }, 400);
    }

    // Add as member
    const { data: membership, error } = await supabaseAdmin
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: foundUser.id,
        role: role?.toLowerCase() || "member",
      })
      .select()
      .single();

    if (error) throw error;

    const profile = await supabaseAdmin
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

    await logActivity(teamId, user.id, "added member", "member", foundUser.id, { name: member.name });
    return c.json({ member });
  } catch (err) {
    console.log(`Add member error: ${err}`);
    return c.json({ error: "Failed to add member" }, 500);
  }
});

app.delete("/make-server-7d783630/teams/:teamId/members/:memberId", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, memberId } = c.req.param();

    const { error } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", memberId);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log(`Remove member error: ${err}`);
    return c.json({ error: "Failed to remove member" }, 500);
  }
});

// ─── Projects ──────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/projects", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();

    const { data: projects, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform to expected format
    const formatted = (projects || []).map((p: any) => ({
      id: p.id,
      teamId: p.team_id,
      name: p.name,
      description: p.description,
      status: p.status,
      color: p.color,
      createdAt: p.created_at,
    }));

    return c.json({ projects: formatted });
  } catch (err) {
    console.log(`Get projects error: ${err}`);
    return c.json({ error: "Failed to get projects" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/projects", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const body = await c.req.json();

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .insert({
        team_id: teamId,
        name: body.name,
        description: body.description,
        status: body.status || "active",
        color: body.color || "#3b82f6",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: project.id,
      teamId: project.team_id,
      name: project.name,
      description: project.description,
      status: project.status,
      color: project.color,
      createdAt: project.created_at,
    };

    await logActivity(teamId, user.id, "created project", "project", project.id, { name: project.name });
    return c.json({ project: formatted });
  } catch (err) {
    console.log(`Create project error: ${err}`);
    return c.json({ error: "Failed to create project" }, 500);
  }
});

app.put("/make-server-7d783630/teams/:teamId/projects/:projectId", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, projectId } = c.req.param();
    const updates = await c.req.json();

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .update({
        name: updates.name,
        description: updates.description,
        status: updates.status,
        color: updates.color,
      })
      .eq("id", projectId)
      .eq("team_id", teamId)
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: project.id,
      teamId: project.team_id,
      name: project.name,
      description: project.description,
      status: project.status,
      color: project.color,
      createdAt: project.created_at,
    };

    return c.json({ project: formatted });
  } catch (err) {
    console.log(`Update project error: ${err}`);
    return c.json({ error: "Failed to update project" }, 500);
  }
});

app.delete("/make-server-7d783630/teams/:teamId/projects/:projectId", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, projectId } = c.req.param();

    const { error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("team_id", teamId);

    if (error) throw error;

    await logActivity(teamId, user.id, "deleted project", "project", projectId);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Delete project error: ${err}`);
    return c.json({ error: "Failed to delete project" }, 500);
  }
});

// ─── Tasks ─────────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/tasks", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();

    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select(`
        *,
        assignee:assignee_id (id, name, email, avatar_url)
      `)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform to expected format
    const formatted = (tasks || []).map((t: any) => ({
      id: t.id,
      teamId: t.team_id,
      projectId: t.project_id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assignee_id,
      assigneeName: t.assignee?.name,
      dueDate: t.due_date,
      createdAt: t.created_at,
      comments: [], // Comments stored separately or in metadata
    }));

    return c.json({ tasks: formatted });
  } catch (err) {
    console.log(`Get tasks error: ${err}`);
    return c.json({ error: "Failed to get tasks" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/tasks", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const body = await c.req.json();

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .insert({
        team_id: teamId,
        project_id: body.projectId || null,
        title: body.title,
        description: body.description,
        status: body.status || "todo",
        priority: body.priority || "medium",
        assignee_id: body.assigneeId || null,
        due_date: body.dueDate || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: task.id,
      teamId: task.team_id,
      projectId: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assignee_id,
      dueDate: task.due_date,
      createdAt: task.created_at,
      comments: [],
    };

    await logActivity(teamId, user.id, "created task", "task", task.id, { title: task.title });
    return c.json({ task: formatted });
  } catch (err) {
    console.log(`Create task error: ${err}`);
    return c.json({ error: "Failed to create task" }, 500);
  }
});

app.put("/make-server-7d783630/teams/:teamId/tasks/:taskId", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, taskId } = c.req.param();
    const updates = await c.req.json();

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.assigneeId !== undefined) updateData.assignee_id = updates.assigneeId;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("team_id", teamId)
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: task.id,
      teamId: task.team_id,
      projectId: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assignee_id,
      dueDate: task.due_date,
      createdAt: task.created_at,
      comments: [],
    };

    if (updates.status === "done") {
      await logActivity(teamId, user.id, "completed task", "task", task.id, { title: task.title });
    } else {
      await logActivity(teamId, user.id, "updated task", "task", task.id, { title: task.title });
    }

    return c.json({ task: formatted });
  } catch (err) {
    console.log(`Update task error: ${err}`);
    return c.json({ error: "Failed to update task" }, 500);
  }
});

app.delete("/make-server-7d783630/teams/:teamId/tasks/:taskId", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, taskId } = c.req.param();

    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("team_id", teamId);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log(`Delete task error: ${err}`);
    return c.json({ error: "Failed to delete task" }, 500);
  }
});

// ─── Calendar Events ───────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/events", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();

    const { data: events, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("team_id", teamId)
      .order("start_time", { ascending: true });

    if (error) throw error;

    const formatted = (events || []).map((e: any) => ({
      id: e.id,
      teamId: e.team_id,
      title: e.title,
      description: e.description,
      start: e.start_time,
      end: e.end_time,
      location: e.location,
      color: e.color,
      createdAt: e.created_at,
    }));

    return c.json({ events: formatted });
  } catch (err) {
    console.log(`Get events error: ${err}`);
    return c.json({ error: "Failed to get events" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/events", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const body = await c.req.json();

    const { data: event, error } = await supabaseAdmin
      .from("events")
      .insert({
        team_id: teamId,
        title: body.title,
        description: body.description,
        start_time: body.start,
        end_time: body.end,
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
      start: event.start_time,
      end: event.end_time,
      location: event.location,
      color: event.color,
      createdAt: event.created_at,
    };

    await logActivity(teamId, user.id, "created event", "event", event.id, { title: event.title });
    return c.json({ event: formatted });
  } catch (err) {
    console.log(`Create event error: ${err}`);
    return c.json({ error: "Failed to create event" }, 500);
  }
});

app.put("/make-server-7d783630/teams/:teamId/events/:eventId", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, eventId } = c.req.param();
    const updates = await c.req.json();

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.start !== undefined) updateData.start_time = updates.start;
    if (updates.end !== undefined) updateData.end_time = updates.end;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.color !== undefined) updateData.color = updates.color;

    const { data: event, error } = await supabaseAdmin
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
      start: event.start_time,
      end: event.end_time,
      location: event.location,
      color: event.color,
      createdAt: event.created_at,
    };

    return c.json({ event: formatted });
  } catch (err) {
    console.log(`Update event error: ${err}`);
    return c.json({ error: "Failed to update event" }, 500);
  }
});

app.delete("/make-server-7d783630/teams/:teamId/events/:eventId", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, eventId } = c.req.param();

    const { error } = await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("team_id", teamId);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log(`Delete event error: ${err}`);
    return c.json({ error: "Failed to delete event" }, 500);
  }
});

// ─── Announcements ─────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/announcements", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();

    const { data: announcements, error } = await supabaseAdmin
      .from("announcements")
      .select(`
        *,
        author:created_by (id, name, email, avatar_url)
      `)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (announcements || []).map((a: any) => ({
      id: a.id,
      teamId: a.team_id,
      title: a.title,
      content: a.content,
      priority: a.priority,
      pinned: a.pinned,
      authorId: a.created_by,
      authorName: a.author?.name || "Unknown",
      likes: [],
      comments: [],
      createdAt: a.created_at,
    }));

    return c.json({ announcements: formatted });
  } catch (err) {
    console.log(`Get announcements error: ${err}`);
    return c.json({ error: "Failed to get announcements" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/announcements", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const body = await c.req.json();

    const { data: announcement, error } = await supabaseAdmin
      .from("announcements")
      .insert({
        team_id: teamId,
        title: body.title || "",
        content: body.content,
        priority: body.priority || "normal",
        pinned: false,
        created_by: user.id,
      })
      .select(`
        *,
        author:created_by (id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    const formatted = {
      id: announcement.id,
      teamId: announcement.team_id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      pinned: announcement.pinned,
      authorId: announcement.created_by,
      authorName: announcement.author?.name || "Unknown",
      likes: [],
      comments: [],
      createdAt: announcement.created_at,
    };

    await logActivity(teamId, user.id, "posted announcement", "announcement", announcement.id);
    return c.json({ announcement: formatted });
  } catch (err) {
    console.log(`Create announcement error: ${err}`);
    return c.json({ error: "Failed to create announcement" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/announcements/:annId/pin", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, annId } = c.req.param();

    // Get current state
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("announcements")
      .select("pinned")
      .eq("id", annId)
      .eq("team_id", teamId)
      .single();

    if (fetchError) throw fetchError;

    const { data: announcement, error } = await supabaseAdmin
      .from("announcements")
      .update({ pinned: !existing.pinned })
      .eq("id", annId)
      .eq("team_id", teamId)
      .select(`
        *,
        author:created_by (id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    const formatted = {
      id: announcement.id,
      teamId: announcement.team_id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      pinned: announcement.pinned,
      authorId: announcement.created_by,
      authorName: announcement.author?.name || "Unknown",
      likes: [],
      comments: [],
      createdAt: announcement.created_at,
    };

    return c.json({ announcement: formatted });
  } catch (err) {
    console.log(`Toggle pin error: ${err}`);
    return c.json({ error: "Failed to toggle pin" }, 500);
  }
});

app.delete("/make-server-7d783630/teams/:teamId/announcements/:annId", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, annId } = c.req.param();

    const { error } = await supabaseAdmin
      .from("announcements")
      .delete()
      .eq("id", annId)
      .eq("team_id", teamId);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log(`Delete announcement error: ${err}`);
    return c.json({ error: "Failed to delete announcement" }, 500);
  }
});

// ─── Messages ──────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/messages", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();

    const { data: messages, error } = await supabaseAdmin
      .from("messages")
      .select(`
        *,
        sender:sender_id (id, name, email, avatar_url)
      `)
      .eq("team_id", teamId)
      .is("chat_group_id", null)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    const formatted = (messages || []).map((m: any) => ({
      id: m.id,
      teamId: m.team_id,
      authorId: m.sender_id,
      authorName: m.sender?.name || "Unknown",
      content: m.content,
      createdAt: m.created_at,
    }));

    return c.json({ messages: formatted });
  } catch (err) {
    console.log(`Get messages error: ${err}`);
    return c.json({ error: "Failed to get messages" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/messages", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const { content } = await c.req.json();

    if (!content?.trim()) return c.json({ error: "Content required" }, 400);

    const { data: message, error } = await supabaseAdmin
      .from("messages")
      .insert({
        team_id: teamId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select(`
        *,
        sender:sender_id (id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    const formatted = {
      id: message.id,
      teamId: message.team_id,
      authorId: message.sender_id,
      authorName: message.sender?.name || "Unknown",
      content: message.content,
      createdAt: message.created_at,
    };

    return c.json({ message: formatted });
  } catch (err) {
    console.log(`Send message error: ${err}`);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// ─── Chat Groups ───────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/chat-groups", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();

    const { data: groups, error } = await supabaseAdmin
      .from("chat_groups")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (groups || []).map((g: any) => ({
      id: g.id,
      teamId: g.team_id,
      name: g.name,
      description: g.description,
      isDirect: g.is_direct,
      createdBy: g.created_by,
      createdAt: g.created_at,
    }));

    return c.json({ groups: formatted });
  } catch (err) {
    console.log(`Get chat groups error: ${err}`);
    return c.json({ error: "Failed to get groups" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/chat-groups", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();
    const { name } = await c.req.json();

    const { data: group, error } = await supabaseAdmin
      .from("chat_groups")
      .insert({
        team_id: teamId,
        name: name || "New Group",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const formatted = {
      id: group.id,
      teamId: group.team_id,
      name: group.name,
      description: group.description,
      isDirect: group.is_direct,
      createdBy: group.created_by,
      createdAt: group.created_at,
    };

    return c.json({ group: formatted });
  } catch (err) {
    console.log(`Create chat group error: ${err}`);
    return c.json({ error: "Failed to create group" }, 500);
  }
});

app.get("/make-server-7d783630/teams/:teamId/chat-groups/:groupId/messages", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, groupId } = c.req.param();

    const { data: messages, error } = await supabaseAdmin
      .from("messages")
      .select(`
        *,
        sender:sender_id (id, name, email, avatar_url)
      `)
      .eq("team_id", teamId)
      .eq("chat_group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    const formatted = (messages || []).map((m: any) => ({
      id: m.id,
      teamId: m.team_id,
      groupId: m.chat_group_id,
      authorId: m.sender_id,
      authorName: m.sender?.name || "Unknown",
      content: m.content,
      createdAt: m.created_at,
    }));

    return c.json({ messages: formatted });
  } catch (err) {
    console.log(`Get group messages error: ${err}`);
    return c.json({ error: "Failed to get group messages" }, 500);
  }
});

app.post("/make-server-7d783630/teams/:teamId/chat-groups/:groupId/messages", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId, groupId } = c.req.param();
    const { content } = await c.req.json();

    if (!content?.trim()) return c.json({ error: "Content required" }, 400);

    const { data: message, error } = await supabaseAdmin
      .from("messages")
      .insert({
        team_id: teamId,
        chat_group_id: groupId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select(`
        *,
        sender:sender_id (id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    const formatted = {
      id: message.id,
      teamId: message.team_id,
      groupId: message.chat_group_id,
      authorId: message.sender_id,
      authorName: message.sender?.name || "Unknown",
      content: message.content,
      createdAt: message.created_at,
    };

    return c.json({ message: formatted });
  } catch (err) {
    console.log(`Send group message error: ${err}`);
    return c.json({ error: "Failed to send group message" }, 500);
  }
});

// ─── Activities ────────────────────────────────────────────────────────────────
app.get("/make-server-7d783630/teams/:teamId/activities", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { teamId } = c.req.param();

    const { data: activities, error } = await supabaseAdmin
      .from("activities")
      .select(`
        *,
        user:user_id (id, name, email, avatar_url)
      `)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const formatted = (activities || []).map((a: any) => ({
      id: a.id,
      teamId: a.team_id,
      userId: a.user_id,
      userName: a.user?.name || "Unknown",
      action: a.action,
      target: a.metadata?.title || a.metadata?.name || a.entity_type,
      type: a.entity_type,
      createdAt: a.created_at,
    }));

    return c.json({ activities: formatted });
  } catch (err) {
    console.log(`Get activities error: ${err}`);
    return c.json({ error: "Failed to get activities" }, 500);
  }
});

Deno.serve(app.fetch);
