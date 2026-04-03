import { projectId, publicAnonKey } from "/utils/supabase/info";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7d783630`;

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken || publicAnonKey}`,
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  signup: (name: string, email: string, password: string) =>
    apiFetch("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  changePassword: (newPassword: string, token: string) =>
    apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify({ newPassword }) }, token),

  // Teams
  getTeams: (token: string) => apiFetch("/teams", {}, token),
  createTeam: (name: string, color: string, token: string) =>
    apiFetch("/teams", { method: "POST", body: JSON.stringify({ name, color }) }, token),
  updateTeam: (teamId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}`, { method: "PUT", body: JSON.stringify(data) }, token),

  // Members
  getMembers: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/members`, {}, token),
  addMember: (teamId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/members`, { method: "POST", body: JSON.stringify(data) }, token),
  updateMember: (teamId: string, memberId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/members/${memberId}`, { method: "PUT", body: JSON.stringify(data) }, token),

  // Projects
  getProjects: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/projects`, {}, token),
  createProject: (teamId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/projects`, { method: "POST", body: JSON.stringify(data) }, token),
  updateProject: (teamId: string, projectId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/projects/${projectId}`, { method: "PUT", body: JSON.stringify(data) }, token),

  // Tasks
  getTasks: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/tasks`, {}, token),
  createTask: (teamId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/tasks`, { method: "POST", body: JSON.stringify(data) }, token),
  updateTask: (teamId: string, taskId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(data) }, token),
  deleteTask: (teamId: string, taskId: string, token: string) =>
    apiFetch(`/teams/${teamId}/tasks/${taskId}`, { method: "DELETE" }, token),
  addTaskComment: (teamId: string, taskId: string, content: string, token: string) =>
    apiFetch(`/teams/${teamId}/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify({ content }) }, token),

  // Events
  getEvents: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/events`, {}, token),
  createEvent: (teamId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/events`, { method: "POST", body: JSON.stringify(data) }, token),
  deleteEvent: (teamId: string, eventId: string, token: string) =>
    apiFetch(`/teams/${teamId}/events/${eventId}`, { method: "DELETE" }, token),

  // Announcements
  getAnnouncements: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements`, {}, token),
  createAnnouncement: (teamId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/announcements`, { method: "POST", body: JSON.stringify(data) }, token),
  toggleLike: (teamId: string, annId: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}/like`, { method: "POST" }, token),
  togglePin: (teamId: string, annId: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}/pin`, { method: "POST" }, token),
  addAnnouncementComment: (teamId: string, annId: string, content: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}/comments`, { method: "POST", body: JSON.stringify({ content }) }, token),

  // Activities
  getActivities: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/activities`, {}, token),
};