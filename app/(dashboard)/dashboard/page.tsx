"use client";

import { useState, useEffect, useRef } from "react";
import { useApp, Project } from "@/context/AppContext";
import { FolderOpen, CheckCircle, ListTodo, Users, Plus, Play, Square, Clock, TrendingUp, Video, Zap, Loader2, CalendarDays, AlertCircle, X, Pencil, Trash2, ExternalLink, Save } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

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

// Project Detail Modal
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
  // Calculate progress based on task completion
  const calculatedProgress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
  const overdue = project.dueDate && project.status !== "completed" && new Date(project.dueDate) < new Date(new Date().toDateString());

  const handleSave = () => {
    updateProject(project.id, { name: editName, description: editDesc, dueDate: editDue, status: editStatus });
    setEditMode(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete project "${project.name}"? This won&apos;t delete associated tasks.`)) {
      deleteProject(project.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
        <div className="h-2 rounded-t-2xl" style={{ background: project.color }} />
        <div className="p-6 border-b" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ background: project.color }}>
                {project.name[0]}
              </div>
              {editMode ? (
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border outline-none font-semibold text-lg" style={{ borderColor: project.color, color: "#111827" }} />
              ) : (
                <div>
                  <h2 style={{ color: "#111827", fontSize: "1.25rem" }}>{project.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs capitalize" style={{ background: project.status === "completed" ? "#ecfdf5" : "#fffbeb", color: project.status === "completed" ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                      {project.status}
                    </span>
                    {overdue && <span className="px-2.5 py-0.5 rounded-full text-xs" style={{ background: "#fef2f2", color: "#ef4444", fontWeight: 600 }}>Overdue</span>}
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
        {editMode && (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium" style={{ color: "#374151" }}>Description</label>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border outline-none" rows={3} style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} placeholder="Add project description..." />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium" style={{ color: "#374151" }}>Due Date</label>
                <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium" style={{ color: "#374151" }}>Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as "active" | "completed")} className="w-full mt-1 px-3 py-2 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <button onClick={handleSave} className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2" style={{ background: "#f59e0b", color: "#111827", fontWeight: 600 }}>
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        )}
        {!editMode && (
          <div className="p-6 space-y-6">
            {project.description && <p style={{ color: "#6b7280", fontSize: "0.875rem", lineHeight: 1.6 }}>{project.description}</p>}
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span style={{ color: "#6b7280" }}>Progress</span><span style={{ color: "#111827", fontWeight: 600 }}>{calculatedProgress}%</span></div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#e5e7eb" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${calculatedProgress}%`, background: project.color }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl" style={{ background: "#f9f9f6" }}>
                <p style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: 4 }}>Tasks</p>
                <p style={{ color: "#111827", fontSize: "1.25rem", fontWeight: 700 }}>{doneTasks}/{projectTasks.length}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "#f9f9f6" }}>
                <p style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: 4 }}>Due Date</p>
                <p style={{ color: overdue ? "#ef4444" : "#111827", fontSize: "1.25rem", fontWeight: 700 }}>{project.dueDate ? new Date(project.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add Project Modal
function AddProjectModal({ onClose }: { onClose: () => void }) {
  const { addProject } = useApp();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState("#f59e0b");
  const [loading, setLoading] = useState(false);

  const colors = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addProject({ name: name.trim(), description, dueDate, color, status: "active", progress: 0 });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className="p-6 border-b" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-center justify-between">
            <h2 style={{ color: "#111827", fontSize: "1.25rem", fontWeight: 600 }}>New Project</h2>
            <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "#9ca3af" }}><X className="w-5 h-5" /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium" style={{ color: "#374151" }}>Project Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} placeholder="Enter project name" autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: "#374151" }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border outline-none" rows={3} style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} placeholder="Add project description..." />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: "#374151" }}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: "#374151" }}>Color</label>
            <div className="flex gap-2 mt-2">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c, border: color === c ? "3px solid #111827" : "none" }}>
                  {color === c && <CheckCircle className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading || !name.trim()} className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ background: loading ? "#d97706" : "#f59e0b", color: "#111827", fontWeight: 600, opacity: loading || !name.trim() ? 0.7 : 1 }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Creating..." : "Create Project"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentProjects, currentTasks, currentMembers, currentEvents, currentActivities, isDataLoading } = useApp();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  const activeProjects = currentProjects.filter((p) => p.status === "active");
  const completedTasks = currentTasks.filter((t) => t.status === "completed").length;
  const pendingTasks = currentTasks.filter((t) => t.status !== "completed").length;

  const stats = [
    { label: "Active Projects", value: activeProjects.length, icon: FolderOpen, color: "#3b82f6", bgColor: "#eff6ff" },
    { label: "Completed Tasks", value: completedTasks, icon: CheckCircle, color: "#10b981", bgColor: "#ecfdf5" },
    { label: "Pending Tasks", value: pendingTasks, icon: ListTodo, color: "#f59e0b", bgColor: "#fffbeb" },
    { label: "Team Members", value: currentMembers.length, icon: Users, color: "#8b5cf6", bgColor: "#f5f3ff" },
  ];

  // Chart data
  const tasksByDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStr = date.toISOString().split("T")[0];
    const tasks = currentTasks.filter((t) => t.createdAt?.startsWith(dayStr)).length;
    return { day: date.toLocaleDateString("en-US", { weekday: "short" }), tasks };
  });

  const projectProgress = currentProjects.slice(0, 5).map((p) => {
    const pTasks = currentTasks.filter((t) => t.projectId === p.id);
    const pDone = pTasks.filter((t) => t.status === "completed").length;
    const calcProgress = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
    return { name: p.name.slice(0, 12), progress: calcProgress, color: p.color };
  });

  const upcomingEvents = [...currentEvents].filter((e) => new Date(e.date) >= new Date(new Date().toDateString())).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 4);

  const recentActivities = [...currentActivities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  if (isDataLoading && currentProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#f59e0b" }} />
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#f0f0ea" }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: s.bgColor }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p style={{ color: "#6b7280", fontSize: "0.8125rem" }}>{s.label}</p>
                <p style={{ color: "#111827", fontSize: "1.5rem", fontWeight: 700 }}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: "#f0f0ea" }}>
          <h3 style={{ color: "#111827", fontWeight: 600, marginBottom: 16 }}>Tasks Created (Last 7 Days)</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tasksByDay}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0ea" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #f0f0ea", borderRadius: 12, fontSize: 13 }} />
                <Area type="monotone" dataKey="tasks" stroke="#f59e0b" strokeWidth={2} fill="url(#colorTasks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: "#f0f0ea" }}>
          <h3 style={{ color: "#111827", fontWeight: 600, marginBottom: 16 }}>Project Progress</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectProgress} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0ea" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 12 }} width={80} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #f0f0ea", borderRadius: 12, fontSize: 13 }} />
                <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                  {projectProgress.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Projects + Events + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f0f0ea" }}>
            <h3 style={{ color: "#111827", fontWeight: 600 }}>Projects</h3>
            <button onClick={() => setAddProjectOpen(true)} className="p-2 rounded-xl" style={{ color: "#f59e0b" }}><Plus className="w-4 h-4" /></button>
          </div>
          <div className="divide-y" style={{ borderColor: "#f0f0ea" }}>
            {currentProjects.slice(0, 5).map((p) => {
              const pTasks = currentTasks.filter((t) => t.projectId === p.id);
              const pDone = pTasks.filter((t) => t.status === "completed").length;
              const pProgress = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
              return (
                <button key={p.id} onClick={() => setSelectedProject(p)} className="w-full text-left px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: p.color }}>{p.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ color: "#111827", fontWeight: 500 }}>{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#e5e7eb" }}>
                        <div className="h-full rounded-full" style={{ width: `${pProgress}%`, background: p.color }} />
                      </div>
                      <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>{pProgress}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {currentProjects.length === 0 && <p className="px-6 py-8 text-center" style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No projects yet</p>}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f0f0ea" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "#f0f0ea" }}>
            <h3 style={{ color: "#111827", fontWeight: 600 }}>Upcoming Events</h3>
          </div>
          <div className="divide-y" style={{ borderColor: "#f0f0ea" }}>
            {upcomingEvents.map((e) => {
              const typeStyle = EVENT_TYPE_COLORS[e.type] || EVENT_TYPE_COLORS.Other;
              const Icon = typeStyle.icon;
              return (
                <div key={e.id} className="px-6 py-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: typeStyle.bg }}>
                    <Icon className="w-4 h-4" style={{ color: typeStyle.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ color: "#111827", fontWeight: 500, fontSize: "0.875rem" }}>{e.title}</p>
                    <p style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: 2 }}>{formatEventDate(e.date)} • {formatEventTime(e.startTime)}</p>
                  </div>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && <p className="px-6 py-8 text-center" style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No upcoming events</p>}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f0f0ea" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "#f0f0ea" }}>
            <h3 style={{ color: "#111827", fontWeight: 600 }}>Recent Activity</h3>
          </div>
          <div className="divide-y" style={{ borderColor: "#f0f0ea" }}>
            {recentActivities.map((a) => {
              const icon = ({ task: "✅", project: "📁", member: "👤", announcement: "📢", event: "📅", comment: "💬", submit: "📤", team: "🏠" } as Record<string, string>)[a.type] || "📌";
              return (
                <div key={a.id} className="px-6 py-3 flex items-center gap-3">
                  <span style={{ fontSize: "1rem" }}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: "0.8125rem", color: "#374151" }}>
                      <span style={{ fontWeight: 600 }}>{a.userName}</span> {a.action}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      {new Date(a.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            {recentActivities.length === 0 && <p className="px-6 py-8 text-center" style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No recent activity</p>}
          </div>
        </div>
      </div>

      {selectedProject && <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
      {addProjectOpen && <AddProjectModal onClose={() => setAddProjectOpen(false)} />}
    </div>
  );
}
