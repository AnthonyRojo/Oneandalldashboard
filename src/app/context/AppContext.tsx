import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "Owner" | "Admin" | "Member";
export type MemberStatus = "Available" | "Busy" | "Away" | "Offline";
export type TaskPriority = "Low" | "Medium" | "High";
export type TaskStatus = "todo" | "in-progress" | "completed";
export type EventType = "Meeting" | "Review" | "Post" | "Other";
export type AnnouncementType = "update" | "poll" | "question";
export type ActivityType = "task" | "project" | "member" | "announcement" | "event" | "comment" | "submit" | "team";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  ownerId: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  status: MemberStatus;
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  status: "active" | "completed";
  progress: number;
  color: string;
  dueDate: string;
  description: string;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  editedAt?: string;
}

export interface Task {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId?: string; // kept for backward compat
  assigneeIds: string[];
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  tags: string[];
  submittedLink?: string;
  submissionStatus?: "pending" | "approved" | "rejected";
  comments: TaskComment[];
  createdAt?: string;
}

export interface CalendarEvent {
  id: string;
  teamId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  type: EventType;
  link?: string;
}

export interface AnnouncementComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  editedAt?: string;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface Announcement {
  id: string;
  teamId: string;
  authorId: string;
  authorName: string;
  content: string;
  pinned: boolean;
  likes: string[];
  comments: AnnouncementComment[];
  attachedProject?: string;
  createdAt: string;
  type: AnnouncementType;
  editedAt?: string;
  pollOptions?: PollOption[];
  pollVotes?: Record<string, string>; // userId → optionId
}

export interface Activity {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  type: ActivityType;
  createdAt: string;
}

export interface ChatGroup {
  id: string;
  teamId: string;
  name: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  teamId: string;
  groupId?: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  deleted?: boolean;
}

// ─── Context Interface ────────────────────────────────────────────────────────

interface AppContextType {
  // Auth
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  // Teams
  teams: Team[];
  currentTeamId: string;
  setCurrentTeamId: (id: string) => void;
  createTeam: (name: string) => Promise<void>;
  currentTeam: Team | undefined;

  // Members
  members: TeamMember[];
  currentMembers: TeamMember[];
  addMember: (member: Omit<TeamMember, "id" | "teamId">) => Promise<void>;
  updateMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;

  // Projects
  projects: Project[];
  currentProjects: Project[];
  addProject: (project: Omit<Project, "id" | "teamId">) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Tasks
  tasks: Task[];
  currentTasks: Task[];
  addTask: (task: Omit<Task, "id" | "teamId" | "comments">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskComment: (taskId: string, content: string) => Promise<void>;
  updateTaskComment: (taskId: string, commentId: string, content: string) => Promise<void>;
  deleteTaskComment: (taskId: string, commentId: string) => Promise<void>;

  // Calendar Events
  events: CalendarEvent[];
  currentEvents: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id" | "teamId">) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Announcements
  announcements: Announcement[];
  currentAnnouncements: Announcement[];
  addAnnouncement: (content: string, type: AnnouncementType, attachedProject?: string, pollOptions?: PollOption[]) => Promise<void>;
  updateAnnouncement: (id: string, content: string) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  toggleLike: (announcementId: string) => Promise<void>;
  togglePin: (announcementId: string) => Promise<void>;
  addAnnouncementComment: (announcementId: string, content: string) => Promise<void>;
  updateAnnouncementComment: (announcementId: string, commentId: string, content: string) => Promise<void>;
  deleteAnnouncementComment: (announcementId: string, commentId: string) => Promise<void>;
  voteOnPoll: (announcementId: string, optionId: string) => Promise<void>;

  // Activities
  activities: Activity[];
  currentActivities: Activity[];

  // Messages
  messages: ChatMessage[];
  currentMessages: ChatMessage[];
  sendMessage: (content: string, groupId?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  loadMessages: () => Promise<void>;

  // Chat Groups
  chatGroups: ChatGroup[];
  createChatGroup: (name: string, memberIds: string[]) => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Data loading
  isDataLoading: boolean;
  refreshTeamData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Auth state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // App data
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamId, setCurrentTeamIdState] = useState<string>("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Refs to avoid stale closures
  const currentTeamRef = useRef<string>("");
  const tokenRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTeam = teams.find((t) => t.id === currentTeamId);
  const currentMembers = members.filter((m) => m.teamId === currentTeamId);
  const currentProjects = projects.filter((p) => p.teamId === currentTeamId);
  const currentTasks = tasks.filter((t) => t.teamId === currentTeamId);
  const currentEvents = events.filter((e) => e.teamId === currentTeamId);
  const currentAnnouncements = announcements.filter((a) => a.teamId === currentTeamId);
  const currentActivities = activities.filter((a) => a.teamId === currentTeamId);
  const currentMessages = messages.filter((m) => m.teamId === currentTeamId);

  // ── Load team data ─────────────────────────────────────────────────────────
  const loadTeamData = useCallback(async (teamId: string, token: string) => {
    if (!teamId || !token) return;
    setIsDataLoading(true);
    try {
      const [membersRes, projectsRes, tasksRes, eventsRes, announcementsRes, activitiesRes, messagesRes, groupsRes] =
        await Promise.all([
          api.getMembers(teamId, token).catch(() => ({ members: [] })),
          api.getProjects(teamId, token).catch(() => ({ projects: [] })),
          api.getTasks(teamId, token).catch(() => ({ tasks: [] })),
          api.getEvents(teamId, token).catch(() => ({ events: [] })),
          api.getAnnouncements(teamId, token).catch(() => ({ announcements: [] })),
          api.getActivities(teamId, token).catch(() => ({ activities: [] })),
          api.getMessages(teamId, token).catch(() => ({ messages: [] })),
          api.getChatGroups(teamId, token).catch(() => ({ groups: [] })),
        ]);

      setMembers((prev) => {
        const others = prev.filter((m) => m.teamId !== teamId);
        return [...others, ...(membersRes.members || [])];
      });
      setProjects((prev) => {
        const others = prev.filter((p) => p.teamId !== teamId);
        return [...others, ...(projectsRes.projects || [])];
      });
      setTasks((prev) => {
        const others = prev.filter((t) => t.teamId !== teamId);
        return [...others, ...(tasksRes.tasks || [])];
      });
      setEvents((prev) => {
        const others = prev.filter((e) => e.teamId !== teamId);
        return [...others, ...(eventsRes.events || [])];
      });
      setAnnouncements((prev) => {
        const others = prev.filter((a) => a.teamId !== teamId);
        return [...others, ...(announcementsRes.announcements || [])];
      });
      setActivities((prev) => {
        const others = prev.filter((a) => a.teamId !== teamId);
        return [...others, ...(activitiesRes.activities || [])];
      });
      setMessages((prev) => {
        const others = prev.filter((m) => m.teamId !== teamId);
        return [...others, ...(messagesRes.messages || [])];
      });
      setChatGroups((prev) => {
        const others = prev.filter((g) => g.teamId !== teamId);
        return [...others, ...(groupsRes.groups || [])];
      });
    } catch (err) {
      console.log(`Load team data error: ${err}`);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const refreshTeamData = useCallback(async () => {
    if (currentTeamId && tokenRef.current) {
      await loadTeamData(currentTeamId, tokenRef.current);
    }
  }, [currentTeamId, loadTeamData]);

  // ── Realtime broadcast ─────────────────────────────────────────────────────
  const broadcastChange = useCallback(() => {
    if (!realtimeChannelRef.current) return;
    realtimeChannelRef.current.send({
      type: "broadcast",
      event: "data_changed",
      payload: { teamId: currentTeamRef.current },
    }).catch((err: any) => console.log(`Broadcast error: ${err}`));
  }, []);

  const subscribeToTeam = useCallback((teamId: string) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    if (!teamId) return;

    const channel = supabase.channel(`team-changes:${teamId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "data_changed" }, () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          if (tokenRef.current && currentTeamRef.current) {
            loadTeamData(currentTeamRef.current, tokenRef.current);
          }
        }, 300);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Realtime: subscribed to team-changes:${teamId}`);
        }
      });

    realtimeChannelRef.current = channel;
  }, [loadTeamData]);

  // ── Load teams ─────────────────────────────────────────────────────────────
  const loadUserTeams = useCallback(async (token: string) => {
    try {
      const res = await api.getTeams(token);
      const userTeams: Team[] = res.teams || [];
      setTeams(userTeams);
      return userTeams;
    } catch (err) {
      console.log(`Load teams error: ${err}`);
      return [];
    }
  }, []);

  // ── Session initialization ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          const user = session.user;
          const name = user.user_metadata?.name || user.email?.split("@")[0] || "User";
          const authUser: AuthUser = {
            id: user.id,
            name,
            email: user.email || "",
            avatar: getInitials(name),
          };
          setCurrentUser(authUser);
          setAccessToken(session.access_token);
          tokenRef.current = session.access_token;

          const userTeams = await loadUserTeams(session.access_token);
          if (userTeams.length > 0 && mounted) {
            const firstTeamId = userTeams[0].id;
            setCurrentTeamIdState(firstTeamId);
            currentTeamRef.current = firstTeamId;
            subscribeToTeam(firstTeamId);
            await loadTeamData(firstTeamId, session.access_token);
          }
        }
      } catch (err) {
        console.log(`Init auth error: ${err}`);
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === "SIGNED_IN" && session?.user) {
          // Handle new sign in — load user data
          const user = session.user;
          const name = user.user_metadata?.name || user.email?.split("@")[0] || "User";
          const authUser: AuthUser = {
            id: user.id,
            name,
            email: user.email || "",
            avatar: getInitials(name),
          };
          setCurrentUser(authUser);
          setAccessToken(session.access_token);
          tokenRef.current = session.access_token;

          const userTeams = await loadUserTeams(session.access_token);
          if (userTeams.length > 0 && mounted) {
            const firstTeamId = userTeams[0].id;
            setCurrentTeamIdState(firstTeamId);
            currentTeamRef.current = firstTeamId;
            subscribeToTeam(firstTeamId);
            await loadTeamData(firstTeamId, session.access_token);
          }
        }
        if (event === "TOKEN_REFRESHED" && session) {
          setAccessToken(session.access_token);
          tokenRef.current = session.access_token;
        }
        if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          setAccessToken(null);
          tokenRef.current = null;
          setTeams([]);
          setCurrentTeamIdState("");
          setMembers([]);
          setProjects([]);
          setTasks([]);
          setEvents([]);
          setAnnouncements([]);
          setActivities([]);
          setMessages([]);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserTeams, loadTeamData, subscribeToTeam]);

  // ── Switch team ────────────────────────────────────────────────────────────
  const setCurrentTeamId = useCallback(
    async (id: string) => {
      if (id === currentTeamRef.current) return;
      setCurrentTeamIdState(id);
      currentTeamRef.current = id;
      if (id && tokenRef.current) {
        subscribeToTeam(id);
        await loadTeamData(id, tokenRef.current);
      }
    },
    [loadTeamData, subscribeToTeam]
  );

  // ── Auth ───────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.session) {
          console.log(`Login error: ${error?.message}`);
          return false;
        }
        const user = data.user;
        const name = user.user_metadata?.name || email.split("@")[0] || "User";
        setCurrentUser({ id: user.id, name, email: user.email || email, avatar: getInitials(name) });
        setAccessToken(data.session.access_token);
        tokenRef.current = data.session.access_token;

        const userTeams = await loadUserTeams(data.session.access_token);
        if (userTeams.length > 0) {
          const firstTeamId = userTeams[0].id;
          setCurrentTeamIdState(firstTeamId);
          currentTeamRef.current = firstTeamId;
          subscribeToTeam(firstTeamId);
          await loadTeamData(firstTeamId, data.session.access_token);
        }
        return true;
      } catch (err) {
        console.log(`Login unexpected error: ${err}`);
        return false;
      }
    },
    [loadUserTeams, loadTeamData, subscribeToTeam]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await api.signup(name, email, password);
        const ok = await login(email, password);
        if (!ok) return { success: false, error: "Account created but sign in failed. Please try logging in." };
        return { success: true };
      } catch (err: any) {
        console.log(`Signup error: ${err}`);
        return { success: false, error: err.message || "Signup failed. Please try again." };
      }
    },
    [login]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    setCurrentUser(null);
    setAccessToken(null);
    tokenRef.current = null;
    setTeams([]);
    setCurrentTeamIdState("");
    currentTeamRef.current = "";
    setMembers([]);
    setProjects([]);
    setTasks([]);
    setEvents([]);
    setAnnouncements([]);
    setActivities([]);
    setMessages([]);
  }, []);

  // ── Team ops ───────────────────────────────────────────────────────────────
  const createTeam = useCallback(
    async (name: string): Promise<void> => {
      if (!tokenRef.current) throw new Error("Not authenticated — please log in again.");
      const colors = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const res = await api.createTeam(name, color, tokenRef.current);
      const newTeam: Team = res.team;
      setTeams((prev) => [...prev, newTeam]);
      setCurrentTeamIdState(newTeam.id);
      currentTeamRef.current = newTeam.id;
      subscribeToTeam(newTeam.id);
      await loadTeamData(newTeam.id, tokenRef.current!);
    },
    [loadTeamData, subscribeToTeam]
  );

  // ── Member ops ─────────────────────────────────────────────────────────────
  const addMember = useCallback(
    async (member: Omit<TeamMember, "id" | "teamId">) => {
      if (!tokenRef.current || !currentTeamId) return;
      const res = await api.addMember(currentTeamId, member, tokenRef.current);
      setMembers((prev) => [...prev, res.member]);
      setActivities((prev) => {
        const act: Activity = { id: `local_${Date.now()}`, teamId: currentTeamId, userId: "", userName: "", action: "added member", target: member.name, type: "member", createdAt: new Date().toISOString() };
        return [act, ...prev];
      });
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const updateMember = useCallback(
    async (id: string, updates: Partial<TeamMember>) => {
      if (!tokenRef.current || !currentTeamId) return;
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
      const res = await api.updateMember(currentTeamId, id, updates, tokenRef.current);
      setMembers((prev) => prev.map((m) => (m.id === id ? res.member : m)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  // ── Project ops ────────────────────────────────────────────────────────────
  const addProject = useCallback(
    async (project: Omit<Project, "id" | "teamId">) => {
      if (!tokenRef.current || !currentTeamId) return;
      const res = await api.createProject(currentTeamId, project, tokenRef.current);
      setProjects((prev) => [...prev, res.project]);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      if (!tokenRef.current || !currentTeamId) return;
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      const res = await api.updateProject(currentTeamId, id, updates, tokenRef.current);
      setProjects((prev) => prev.map((p) => (p.id === id ? res.project : p)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      if (!tokenRef.current || !currentTeamId) return;
      setProjects((prev) => prev.filter((p) => p.id !== id));
      await api.deleteProject(currentTeamId, id, tokenRef.current);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  // ── Task ops ───────────────────────────────────────────────────────────────
  const addTask = useCallback(
    async (task: Omit<Task, "id" | "teamId" | "comments">) => {
      if (!tokenRef.current || !currentTeamId) return;
      const res = await api.createTask(currentTeamId, task, tokenRef.current);
      setTasks((prev) => [...prev, res.task]);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      if (!tokenRef.current || !currentTeamId) return;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      const res = await api.updateTask(currentTeamId, id, updates, tokenRef.current);
      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === id ? res.task : t));
        // Auto-recalculate project progress when status changes
        if (updates.status !== undefined && res.task?.projectId) {
          const projectTasks = updated.filter(
            (t) => t.teamId === currentTeamId && t.projectId === res.task.projectId
          );
          const total = projectTasks.length;
          const done = projectTasks.filter((t) => t.status === "completed").length;
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;
          setTimeout(() => {
            setProjects((p) =>
              p.map((proj) => (proj.id === res.task.projectId ? { ...proj, progress } : proj))
            );
            if (tokenRef.current && currentTeamId) {
              api
                .updateProject(currentTeamId, res.task.projectId, { progress }, tokenRef.current)
                .catch((e) => console.log(`Auto-progress update error: ${e}`));
            }
          }, 0);
        }
        return updated;
      });
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!tokenRef.current || !currentTeamId) return;
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await api.deleteTask(currentTeamId, id, tokenRef.current);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const addTaskComment = useCallback(
    async (taskId: string, content: string) => {
      if (!tokenRef.current || !currentTeamId || !content.trim()) return;
      const res = await api.addTaskComment(currentTeamId, taskId, content, tokenRef.current);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const updateTaskComment = useCallback(
    async (taskId: string, commentId: string, content: string) => {
      if (!tokenRef.current || !currentTeamId || !content.trim()) return;
      const res = await api.updateTaskComment(currentTeamId, taskId, commentId, content, tokenRef.current);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const deleteTaskComment = useCallback(
    async (taskId: string, commentId: string) => {
      if (!tokenRef.current || !currentTeamId) return;
      const res = await api.deleteTaskComment(currentTeamId, taskId, commentId, tokenRef.current);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  // ── Event ops ──────────────────────────────────────────────────────────────
  const addEvent = useCallback(
    async (event: Omit<CalendarEvent, "id" | "teamId">) => {
      if (!tokenRef.current || !currentTeamId) return;
      const res = await api.createEvent(currentTeamId, event, tokenRef.current);
      setEvents((prev) => [...prev, res.event]);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<CalendarEvent>) => {
      if (!tokenRef.current || !currentTeamId) return;
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      const res = await api.updateEvent(currentTeamId, id, updates, tokenRef.current);
      setEvents((prev) => prev.map((e) => (e.id === id ? res.event : e)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!tokenRef.current || !currentTeamId) return;
      setEvents((prev) => prev.filter((e) => e.id !== id));
      await api.deleteEvent(currentTeamId, id, tokenRef.current);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  // ── Announcement ops ───────────────────────────────────────────────────────
  const addAnnouncement = useCallback(
    async (content: string, type: AnnouncementType, attachedProject?: string, pollOptions?: PollOption[]) => {
      if (!tokenRef.current || !currentTeamId) return;
      const res = await api.createAnnouncement(
        currentTeamId,
        { content, type, attachedProject, pollOptions, pollVotes: pollOptions ? {} : undefined },
        tokenRef.current
      );
      setAnnouncements((prev) => [res.announcement, ...prev]);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const updateAnnouncement = useCallback(
    async (id: string, content: string) => {
      if (!tokenRef.current || !currentTeamId) return;
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, content } : a)));
      const res = await api.updateAnnouncement(currentTeamId, id, content, tokenRef.current);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? res.announcement : a)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const deleteAnnouncement = useCallback(
    async (id: string) => {
      if (!tokenRef.current || !currentTeamId) return;
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      await api.deleteAnnouncement(currentTeamId, id, tokenRef.current);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const toggleLike = useCallback(
    async (announcementId: string) => {
      if (!tokenRef.current || !currentTeamId || !currentUser) return;
      setAnnouncements((prev) =>
        prev.map((a) => {
          if (a.id !== announcementId) return a;
          const liked = a.likes.includes(currentUser.id);
          return { ...a, likes: liked ? a.likes.filter((id) => id !== currentUser.id) : [...a.likes, currentUser.id] };
        })
      );
      const res = await api.toggleLike(currentTeamId, announcementId, tokenRef.current);
      setAnnouncements((prev) => prev.map((a) => (a.id === announcementId ? res.announcement : a)));
      broadcastChange();
    },
    [currentTeamId, currentUser, broadcastChange]
  );

  const togglePin = useCallback(
    async (announcementId: string) => {
      if (!tokenRef.current || !currentTeamId) return;
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcementId ? { ...a, pinned: !a.pinned } : a))
      );
      const res = await api.togglePin(currentTeamId, announcementId, tokenRef.current);
      setAnnouncements((prev) => prev.map((a) => (a.id === announcementId ? res.announcement : a)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const addAnnouncementComment = useCallback(
    async (announcementId: string, content: string) => {
      if (!tokenRef.current || !currentTeamId || !content.trim()) return;
      const res = await api.addAnnouncementComment(currentTeamId, announcementId, content, tokenRef.current);
      setAnnouncements((prev) => prev.map((a) => (a.id === announcementId ? res.announcement : a)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const updateAnnouncementComment = useCallback(
    async (announcementId: string, commentId: string, content: string) => {
      if (!tokenRef.current || !currentTeamId || !content.trim()) return;
      const res = await api.updateAnnouncementComment(currentTeamId, announcementId, commentId, content, tokenRef.current);
      setAnnouncements((prev) => prev.map((a) => (a.id === announcementId ? res.announcement : a)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const deleteAnnouncementComment = useCallback(
    async (announcementId: string, commentId: string) => {
      if (!tokenRef.current || !currentTeamId) return;
      const res = await api.deleteAnnouncementComment(currentTeamId, announcementId, commentId, tokenRef.current);
      setAnnouncements((prev) => prev.map((a) => (a.id === announcementId ? res.announcement : a)));
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const voteOnPoll = useCallback(
    async (announcementId: string, optionId: string) => {
      if (!tokenRef.current || !currentTeamId || !currentUser) return;
      // Optimistic update
      setAnnouncements((prev) =>
        prev.map((a) => {
          if (a.id !== announcementId) return a;
          const votes = { ...(a.pollVotes || {}), [currentUser.id]: optionId };
          return { ...a, pollVotes: votes };
        })
      );
      const res = await api.voteOnPoll(currentTeamId, announcementId, optionId, tokenRef.current);
      setAnnouncements((prev) => prev.map((a) => (a.id === announcementId ? res.announcement : a)));
      broadcastChange();
    },
    [currentTeamId, currentUser, broadcastChange]
  );

  // ── Message ops ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string, groupId?: string) => {
      if (!tokenRef.current || !currentTeamId || !content.trim()) return;
      const res = await api.sendMessage(currentTeamId, content, tokenRef.current, groupId);
      setMessages((prev) => [...prev, res.message]);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!tokenRef.current || !currentTeamId || !content.trim()) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, editedAt: new Date().toISOString() } : m))
      );
      await api.editMessage(currentTeamId, messageId, content, tokenRef.current);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!tokenRef.current || !currentTeamId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deleted: true, content: "This message was deleted." } : m))
      );
      await api.deleteMessage(currentTeamId, messageId, tokenRef.current);
      broadcastChange();
    },
    [currentTeamId, broadcastChange]
  );

  const loadMessages = useCallback(
    async () => {
      if (!tokenRef.current || !currentTeamId) return;
      const res = await api.getMessages(currentTeamId, tokenRef.current);
      const msgs = res.messages || [];
      setMessages((prev) => {
        const others = prev.filter((m) => m.teamId !== currentTeamId);
        return [...others, ...msgs];
      });
    },
    [currentTeamId]
  );

  // ── Chat Group ops ─────────────────────────────────────────────────────────
  const createChatGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      if (!tokenRef.current || !currentTeamId || !currentUser) return;
      const res = await api.createChatGroup(currentTeamId, name, memberIds, tokenRef.current);
      setChatGroups((prev) => [...prev, res.group]);
    },
    [currentTeamId, currentUser]
  );

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAuthLoading,
        accessToken,
        login,
        signup,
        logout,
        teams,
        currentTeamId,
        setCurrentTeamId,
        createTeam,
        currentTeam,
        members,
        currentMembers,
        addMember,
        updateMember,
        projects,
        currentProjects,
        addProject,
        updateProject,
        deleteProject,
        tasks,
        currentTasks,
        addTask,
        updateTask,
        deleteTask,
        addTaskComment,
        updateTaskComment,
        deleteTaskComment,
        events,
        currentEvents,
        addEvent,
        updateEvent,
        deleteEvent,
        announcements,
        currentAnnouncements,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        toggleLike,
        togglePin,
        addAnnouncementComment,
        updateAnnouncementComment,
        deleteAnnouncementComment,
        voteOnPoll,
        activities,
        currentActivities,
        messages,
        currentMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        loadMessages,
        chatGroups,
        createChatGroup,
        searchQuery,
        setSearchQuery,
        isDataLoading,
        refreshTeamData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
