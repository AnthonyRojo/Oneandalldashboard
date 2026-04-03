import { useState, useEffect, useRef } from "react";
import { useApp, Project } from "../context/AppContext";
import { FolderOpen, CheckCircle, ListTodo, Users, Plus, Play, Square, Clock, TrendingUp, Video, Zap, Loader2, CalendarDays, AlertCircle, X, Pencil, Trash2, ExternalLink, Save } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";
import AddProjectModal from "../components/modals/AddProjectModal";

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatEventTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; color: string; icon: typeof Video }> = {
  Meeting: { bg: "#eff6ff", color: "#3b82f6", icon: Video },
  Deadline: { bg: "#fef2f2", color: "#ef4444", icon: AlertCircle },
  Review: { bg: "#fffbeb", color: "#f59e0b", icon: TrendingUp },
  Other: { bg: "#f3f4f6", color: "#6b7280", icon: CalendarDays },
};

// ── Project Detail Modal ───────────────────────────────────────────────────────
function ProjectDetailModal({ project: initialProject, onClose }: { project: Project; onClose: () => void }) {
  const { currentProjects, currentTasks, updateProject, deleteProject } = useApp();
  const project = currentProjects.find((p) => p.id === initialProject.id) || initialProject;
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description || "");
  const [editDue, setEditDue] = useState(project.dueDate || "");
  const [editStatus, setEditStatus] = useState<"active" | "completed">(project.status);

  const projectTasks = currentTasks.filter((t) => t.projectId === project.id);
  const doneTasks = projectTasks.filter((t) => t.status === "completed").length;
  const overdue = project.dueDate && project.status !== "completed" && new Date(project.dueDate) < new Date(new Date().toDateString());

  const handleSave = () => {
    updateProject(project.id, { name: editName, description: editDesc, dueDate: editDue, status: editStatus });
    setEditMode(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete project "${project.name}"? This won't delete associated tasks.`)) {
      deleteProject(project.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
        {/* Color-coded top bar */}
        <div className="h-2 rounded-t-2xl" style={{ background: project.color }} />
        <div className="p-6 border-b" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                style={{ background: project.color }}>
                {project.name[0]}
              </div>
              {editMode ? (
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border outline-none font-semibold text-lg"
                  style={{ borderColor: project.color, color: "#111827" }} />
              ) : (
                <div>
                  <h2 style={{ color: "#111827", fontSize: "1.25rem" }}>{project.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs capitalize"
                      style={{ background: project.status === "completed" ? "#ecfdf5" : "#fffbeb", color: project.status === "completed" ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                      {project.status}
                    </span>
                    {overdue && <span className="px-2.5 py-0.5 rounded-full text-xs" style={{ background: "#fef2f2", color: "#ef4444", fontWeight: 600 }}>⚠ Overdue</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setEditMode(!editMode)} className="p-2 rounded-xl" style={{ color: editMode ? "#f59e0b" : "#9ca3af" }}><Pencil className="w-4 h-4" /></button>
              <button onClick={handleDelete} className="p-2 rounded-xl" style={{ color: "#ef4444" }}><Trash2 className="w-4 h-4" /></button>
              <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "#9ca3af" }}><X className="w-5 h-5" /></button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Progress</p>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: project.color }}>{project.progress}%</span>
            </div>
            <div className="h-3 rounded-full" style={{ background: "#f0f0ea" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, background: project.color }} />
            </div>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 6 }}>{doneTasks}/{projectTasks.length} tasks completed</p>
          </div>

          {/* Description */}
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 6 }}>Description</p>
            {editMode ? (
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-xl border outline-none resize-none"
                style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
            ) : project.description ? (
              <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{project.description}</p>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "#9ca3af", fontStyle: "italic" }}>No description</p>
            )}
          </div>

          {/* Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 6 }}>Deadline</p>
              {editMode ? (
                <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="w-full px-3 py-1.5 rounded-xl border outline-none" style={{ fontSize: "0.875rem", borderColor: "#e5e7eb" }} />
              ) : (
                <p style={{ fontSize: "0.875rem", color: overdue ? "#ef4444" : "#374151", fontWeight: overdue ? 600 : 400 }}>
                  {project.dueDate || "—"}{overdue && " (Overdue)"}
                </p>
              )}
            </div>
            {editMode && (
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 6 }}>Status</p>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)} className="w-full px-3 py-1.5 rounded-xl border outline-none" style={{ fontSize: "0.875rem", borderColor: "#e5e7eb" }}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}
          </div>

          {editMode && (
            <button onClick={handleSave} className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2"
              style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
              <Save className="w-4 h-4" /> Save Changes
            </button>
          )}

          {/* Tasks */}
          {projectTasks.length > 0 && (
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 8 }}>Tasks ({projectTasks.length})</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {projectTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#fafaf7" }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: t.status === "completed" ? "#10b981" : t.status === "in-progress" ? "#f59e0b" : "#e5e7eb" }} />
                    <p className="flex-1 truncate" style={{ fontSize: "0.8125rem", color: "#374151" }}>{t.title}</p>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeTracker() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const format = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 h-full" style={{ background: "#111827" }}>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" style={{ color: "#f59e0b" }} />
        <span style={{ color: "#9ca3af", fontSize: "0.875rem", fontWeight: 500 }}>Time Tracker</span>
      </div>
      <div className="text-center py-2">
        <div style={{ fontFamily: "monospace", fontSize: "2.25rem", color: "white", fontWeight: 700, letterSpacing: "0.05em" }}>
          {format(seconds)}
        </div>
        <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginTop: 4 }}>
          {running ? "⏱ Timer running..." : seconds > 0 ? "Paused" : "Not started"}
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setRunning(!running)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
          style={{ background: running ? "rgba(245,158,11,0.15)" : "#f59e0b", color: running ? "#f59e0b" : "#111827" }}>
          <Play className="w-4 h-4" fill={running ? "none" : "currentColor"} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{running ? "Pause" : "Start"}</span>
        </button>
        <button onClick={() => { setRunning(false); setSeconds(0); }}
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all"
          style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
          <Square className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-auto">
        {[
          { label: "Today", val: format(seconds) },
          { label: "Session", val: running ? "Active" : "Idle" },
          { label: "Paused", val: running ? "No" : seconds > 0 ? "Yes" : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
            <p style={{ color: "#9ca3af", fontSize: "0.6875rem" }}>{s.label}</p>
            <p style={{ color: "white", fontSize: "0.75rem", fontWeight: 600 }}>{s.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentTeam, currentProjects, currentTasks, currentMembers, currentEvents, currentActivities, isDataLoading, createTeam, teams } = useApp();
  const [showAddProject, setShowAddProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState("");

  const handleCreateFirstTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    setCreateTeamError("");
    try {
      await createTeam(newTeamName.trim());
      setNewTeamName("");
    } catch (err: any) {
      setCreateTeamError(err.message || "Failed to create team. Please try again.");
    } finally {
      setCreatingTeam(false);
    }
  };

  // Show empty state when there are no teams
  if (!isDataLoading && teams.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ minHeight: "60vh" }}>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: "#fffbeb" }}>
            <Zap className="w-10 h-10" style={{ color: "#f59e0b" }} />
          </div>
          <h2 className="mb-2" style={{ color: "#111827", fontSize: "1.5rem", fontWeight: 700 }}>Welcome to One&All!</h2>
          <p className="mb-8" style={{ color: "#6b7280", lineHeight: 1.7 }}>
            Create your first team to start collaborating with colleagues, managing projects and tasks, and keeping everyone in sync.
          </p>
          <form onSubmit={handleCreateFirstTeam} className="flex flex-col items-center gap-3">
            <div className="flex gap-3 w-full justify-center">
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name..."
                className="flex-1 max-w-xs px-4 py-3 rounded-xl border outline-none"
                style={{ borderColor: createTeamError ? "#ef4444" : "#e5e7eb", fontSize: "0.9375rem" }}
                onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                onBlur={(e) => e.target.style.borderColor = createTeamError ? "#ef4444" : "#e5e7eb"}
              />
              <button type="submit" disabled={creatingTeam || !newTeamName.trim()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl transition-all"
                style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, opacity: creatingTeam ? 0.7 : 1 }}>
                {creatingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creatingTeam ? "Creating..." : "Create Team"}
              </button>
            </div>
            {createTeamError && <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>{createTeamError}</p>}
          </form>
        </div>
      </div>
    );
  }

  if (isDataLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading workspace data...</p>
        </div>
      </div>
    );
  }

  const activeProjects = currentProjects.filter((p) => p.status === "active");
  const completedProjects = currentProjects.filter((p) => p.status === "completed");
  const activeTasks = currentTasks.filter((t) => t.status !== "completed");

  // Build last-7-days activity chart from real activities
  const today = new Date();
  const weekChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = d.toISOString().split("T")[0];
    const dayActivities = currentActivities.filter((a) => a.createdAt?.startsWith(dateStr));
    const total = dayActivities.length;
    const completed = dayActivities.filter((a) => a.action === "completed task").length;
    return { day: label, tasks: total, completed };
  });

  // Build project progress chart — use id to guarantee unique keys
  const projectProgressData = currentProjects.map((p, i) => ({
    name: p.name.length > 14 ? p.name.slice(0, 13) + "…" : p.name,
    // suffix index so recharts never sees two identical category keys
    uniqueKey: `${p.id}-${i}`,
    progress: p.progress,
    fill: p.color || "#f59e0b",
  }));

  // Upcoming events (next 3, sorted by date)
  const upcomingEvents = [...currentEvents]
    .filter((e) => new Date(e.date + "T23:59:59") >= today)
    .sort((a, b) => {
      const da = new Date(a.date + "T" + a.startTime);
      const db = new Date(b.date + "T" + b.startTime);
      return da.getTime() - db.getTime();
    })
    .slice(0, 4);

  const SUMMARY_CARDS = [
    { label: "Total Projects", value: currentProjects.length, icon: FolderOpen, color: "#f59e0b", bg: "#fffbeb", empty: "No projects yet" },
    { label: "Completed", value: completedProjects.length, icon: CheckCircle, color: "#10b981", bg: "#ecfdf5", empty: "None completed" },
    { label: "Active Tasks", value: activeTasks.length, icon: ListTodo, color: "#3b82f6", bg: "#eff6ff", empty: "No open tasks" },
    { label: "Team Members", value: currentMembers.length, icon: Users, color: "#8b5cf6", bg: "#f5f3ff", empty: "No members" },
  ];

  const STATUS_COLORS: Record<string, string> = {
    Available: "#10b981", Busy: "#ef4444", Away: "#f59e0b", Offline: "#d1d5db"
  };

  // Compute effective status for each member from tasks
  const getMemberStatus = (memberId: string, stored: string) => {
    const busy = currentTasks.some(
      (t) => t.status === "in-progress" && ((t.assigneeIds?.includes(memberId)) || t.assigneeId === memberId)
    );
    return busy ? "Busy" : stored;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>{currentTeam?.name}</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: 4 }}>
            Welcome back! Here's what's happening with your team.
          </p>
        </div>
        <button onClick={() => setShowAddProject(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
          style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
          <Plus className="w-4 h-4" /> Add Project
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {SUMMARY_CARDS.map(({ label, value, icon: Icon, color, bg, empty }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#f0f0ea" }}>
            <div className="flex items-center justify-between mb-4">
              <span style={{ color: "#6b7280", fontSize: "0.8125rem", fontWeight: 500 }}>{label}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            {value > 0 ? (
              <p style={{ fontSize: "1.875rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{value}</p>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: "0.8125rem" }}>{empty}</p>
            )}
          </div>
        ))}
      </div>

      {/* Team Status Bar */}
      {currentMembers.length > 0 && (
        <div className="bg-white rounded-2xl border p-4 mb-6 flex items-center gap-3 flex-wrap" style={{ borderColor: "#f0f0ea" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginRight: 4 }}>Team:</span>
          {currentMembers.map((m) => {
            const status = getMemberStatus(m.id, m.status);
            const statusColor = STATUS_COLORS[status] || "#d1d5db";
            return (
              <div key={m.id} className="flex items-center gap-1.5" title={`${m.name} — ${status}`}>
                <div className="relative">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: getAvatarColor(m.name) }}>
                    {m.avatar}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                    style={{ background: statusColor }} />
                </div>
                <div>
                  <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "#374151", lineHeight: 1.2 }}>{m.name.split(" ")[0]}</p>
                  <p style={{ fontSize: "0.625rem", color: statusColor, fontWeight: 600 }}>{status}</p>
                </div>
              </div>
            );
          })}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} /><span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Available</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} /><span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Busy</span></div>
          </div>
        </div>
      )}

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Activity Chart — real data from activities */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ color: "#111827" }}>Team Activity</h3>
              <p style={{ color: "#6b7280", fontSize: "0.8125rem" }}>Actions and completions over the last 7 days</p>
            </div>
          </div>
          {weekChartData.every((d) => d.tasks === 0) ? (
            <div className="h-48 flex items-center justify-center flex-col gap-2" style={{ color: "#9ca3af" }}>
              <TrendingUp className="w-8 h-8" style={{ color: "#e5e7eb" }} />
              <p style={{ fontSize: "0.875rem" }}>Activity will appear here as your team works</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weekChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tasksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ea" />
                <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0ea" }} />
                <Area key="area-tasks" type="monotone" dataKey="tasks" stroke="#f59e0b" strokeWidth={2} fill="url(#tasksGrad)" name="Total Actions" dot={false} activeDot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }} />
                <Area key="area-completed" type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fill="url(#completedGrad)" name="Completed" dot={false} activeDot={{ fill: "#10b981", r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming Events — real from currentEvents */}
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#f0f0ea" }}>
          <h3 className="mb-4" style={{ color: "#111827" }}>Upcoming Events</h3>
          {upcomingEvents.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: "#e5e7eb" }} />
              <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No upcoming events</p>
              <p style={{ color: "#d1d5db", fontSize: "0.8125rem", marginTop: 4 }}>Go to Calendar to create one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => {
                const conf = EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.Other;
                const Icon = conf.icon;
                const hasLink = !!event.link;
                return (
                  <div key={event.id}
                    className="flex items-start gap-3 p-3 rounded-xl transition-all"
                    style={{ background: conf.bg, cursor: hasLink ? "pointer" : "default", border: `1px solid ${conf.bg}` }}
                    onClick={() => hasLink && window.open(event.link, "_blank", "noopener,noreferrer")}
                    onMouseEnter={(e) => { if (hasLink) e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { if (hasLink) e.currentTarget.style.opacity = "1"; }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "white" }}>
                      <Icon className="w-4 h-4" style={{ color: conf.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827" }} className="truncate">{event.title}</p>
                        {hasLink && <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: conf.color }} />}
                      </div>
                      <p style={{ fontSize: "0.75rem", color: conf.color, marginTop: 2 }}>
                        {formatEventDate(event.date)} · {formatEventTime(event.startTime)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Projects List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#f0f0ea" }}>
            <h3 style={{ color: "#111827" }}>Projects</h3>
            <button onClick={() => setShowAddProject(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "#fffbeb", color: "#f59e0b" }}>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {currentProjects.length === 0 ? (
            <div className="p-12 text-center">
              <FolderOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#e5e7eb" }} />
              <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginBottom: 12 }}>No projects yet</p>
              <button onClick={() => setShowAddProject(true)}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ background: "#fffbeb", color: "#f59e0b", fontWeight: 500 }}>
                + Create your first project
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ divideColor: "#f0f0ea" }}>
              {activeProjects.slice(0, 5).map((project) => {
                const projectTasks = currentTasks.filter((t) => t.projectId === project.id);
                const done = projectTasks.filter((t) => t.status === "completed").length;
                const overdue = project.dueDate && project.status !== "completed" && new Date(project.dueDate) < new Date(new Date().toDateString());
                return (
                  <div key={project.id}
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all"
                    style={{ background: "white" }}
                    onClick={() => setSelectedProject(project)}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafaf7"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style={{ background: project.color }}>
                      {project.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <p style={{ fontWeight: 500, color: "#111827", fontSize: "0.9375rem" }} className="truncate">{project.name}</p>
                          {overdue && <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0" style={{ background: "#fef2f2", color: "#ef4444", fontWeight: 600 }}>Overdue</span>}
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: 8, flexShrink: 0 }}>{project.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "#f0f0ea" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, background: project.color }} />
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>
                        {done}/{projectTasks.length} tasks · {project.dueDate ? `Due ${project.dueDate}` : "No deadline"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Time Tracker */}
        <TimeTracker />
      </div>

      {/* Project Progress Bar Chart */}
      {projectProgressData.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
          <h3 className="mb-1" style={{ color: "#111827" }}>Project Progress</h3>
          <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginBottom: 16 }}>Completion % per project</p>
          <ResponsiveContainer width="100%" height={Math.max(80, projectProgressData.length * 48)}>
            <BarChart data={projectProgressData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ea" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#374151", fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0ea" }} formatter={(v) => [`${v}%`, "Progress"]} />
              <Bar key="bar-progress" dataKey="progress" radius={[0, 6, 6, 0]}>
                {projectProgressData.map((entry, index) => (
                  <Cell key={`bar-cell-${entry.uniqueKey}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Modals */}
      {showAddProject && <AddProjectModal onClose={() => setShowAddProject(false)} />}
      {selectedProject && <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </div>
  );
}