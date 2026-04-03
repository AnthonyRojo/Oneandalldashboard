import { projectId, publicAnonKey } from "/utils/supabase/info";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7d783630`;

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null
) {
  // Always send the anon key as Authorization so Supabase's invocation layer
  // never rejects the request. Pass the actual user JWT in a custom header
  // that our Hono server reads for authentication.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${publicAnonKey}`,
    ...(accessToken ? { "x-user-token": accessToken } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || body.message || `HTTP ${res.status}`);
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
  deleteProject: (teamId: string, projectId: string, token: string) =>
    apiFetch(`/teams/${teamId}/projects/${projectId}`, { method: "DELETE" }, token),

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
  updateTaskComment: (teamId: string, taskId: string, commentId: string, content: string, token: string) =>
    apiFetch(`/teams/${teamId}/tasks/${taskId}/comments/${commentId}`, { method: "PUT", body: JSON.stringify({ content }) }, token),
  deleteTaskComment: (teamId: string, taskId: string, commentId: string, token: string) =>
    apiFetch(`/teams/${teamId}/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" }, token),

  // Events
  getEvents: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/events`, {}, token),
  createEvent: (teamId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/events`, { method: "POST", body: JSON.stringify(data) }, token),
  updateEvent: (teamId: string, eventId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/events/${eventId}`, { method: "PUT", body: JSON.stringify(data) }, token),
  deleteEvent: (teamId: string, eventId: string, token: string) =>
    apiFetch(`/teams/${teamId}/events/${eventId}`, { method: "DELETE" }, token),

  // Announcements
  getAnnouncements: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements`, {}, token),
  createAnnouncement: (teamId: string, data: object, token: string) =>
    apiFetch(`/teams/${teamId}/announcements`, { method: "POST", body: JSON.stringify(data) }, token),
  updateAnnouncement: (teamId: string, annId: string, content: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}`, { method: "PUT", body: JSON.stringify({ content }) }, token),
  deleteAnnouncement: (teamId: string, annId: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}`, { method: "DELETE" }, token),
  toggleLike: (teamId: string, annId: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}/like`, { method: "POST" }, token),
  togglePin: (teamId: string, annId: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}/pin`, { method: "POST" }, token),
  addAnnouncementComment: (teamId: string, annId: string, content: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}/comments`, { method: "POST", body: JSON.stringify({ content }) }, token),
  updateAnnouncementComment: (teamId: string, annId: string, commentId: string, content: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}/comments/${commentId}`, { method: "PUT", body: JSON.stringify({ content }) }, token),
  deleteAnnouncementComment: (teamId: string, annId: string, commentId: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}/comments/${commentId}`, { method: "DELETE" }, token),
  voteOnPoll: (teamId: string, annId: string, optionId: string, token: string) =>
    apiFetch(`/teams/${teamId}/announcements/${annId}/vote`, { method: "POST", body: JSON.stringify({ optionId }) }, token),

  // Activities
  getActivities: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/activities`, {}, token),

  // Messages
  getMessages: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/messages`, {}, token),
  sendMessage: (teamId: string, content: string, token: string, groupId?: string) =>
    groupId
      ? apiFetch(`/teams/${teamId}/chat-groups/${groupId}/messages`, { method: "POST", body: JSON.stringify({ content }) }, token)
      : apiFetch(`/teams/${teamId}/messages`, { method: "POST", body: JSON.stringify({ content }) }, token),
  editMessage: (teamId: string, messageId: string, content: string, token: string, groupId?: string) =>
    apiFetch(`/teams/${teamId}/messages/${messageId}`, { method: "PUT", body: JSON.stringify({ content, groupId }) }, token),
  deleteMessage: (teamId: string, messageId: string, token: string, groupId?: string) =>
    apiFetch(`/teams/${teamId}/messages/${messageId}${groupId ? `?groupId=${groupId}` : ""}`, { method: "DELETE" }, token),
  getGroupMessages: (teamId: string, groupId: string, token: string) =>
    apiFetch(`/teams/${teamId}/chat-groups/${groupId}/messages`, {}, token),
  getChatGroups: (teamId: string, token: string) =>
    apiFetch(`/teams/${teamId}/chat-groups`, {}, token),
  createChatGroup: (teamId: string, name: string, memberIds: string[], token: string) =>
    apiFetch(`/teams/${teamId}/chat-groups`, { method: "POST", body: JSON.stringify({ name, memberIds }) }, token),
};