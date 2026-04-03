import { useState } from "react";
import { useApp, Task, TaskPriority, TaskStatus } from "../context/AppContext";
import { Plus, Search, Filter, CheckCircle, Clock, AlertCircle, MessageSquare, X, Send, ChevronDown, Tag, Calendar, Trash2 } from "lucide-react";

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; label: string }> = {
  High: { color: "#ef4444", bg: "#fef2f2", label: "High" },
  Medium: { color: "#f59e0b", bg: "#fffbeb", label: "Medium" },
  Low: { color: "#10b981", bg: "#ecfdf5", label: "Low" },
};

const STATUS_CONFIG: Record<TaskStatus, { color: string; bg: string; icon: typeof CheckCircle; label: string }> = {
  "completed": { color: "#10b981", bg: "#ecfdf5", icon: CheckCircle, label: "Completed" },
  "in-progress": { color: "#f59e0b", bg: "#fffbeb", icon: Clock, label: "In Progress" },
  "todo": { color: "#6b7280", bg: "#f3f4f6", icon: AlertCircle, label: "To Do" },
};

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const { currentProjects, currentMembers, addTask } = useApp();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(currentProjects[0]?.id || "");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      projectId,
      title,
      description,
      assigneeId,
      priority,
      status,
      dueDate,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    onClose();
  };

  const inputStyle = { borderColor: "#e5e7eb", fontSize: "0.875rem" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 style={{ color: "#111827" }}>Create New Task</h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "#9ca3af" }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle}>
              {currentProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required
              className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Describe the task..." className="w-full px-4 py-2.5 rounded-xl border outline-none resize-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Assign To</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle}>
                <option value="">Unassigned</option>
                {currentMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle}>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="design, frontend, urgent"
              className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border" style={{ borderColor: "#e5e7eb", color: "#374151", fontSize: "0.875rem" }}>Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl" style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailModal({ task: initialTask, onClose }: { task: Task; onClose: () => void }) {
  const { currentMembers, currentProjects, updateTask, addTaskComment, currentUser, currentTasks } = useApp();
  // Always read the live task from context so updates (comments, status) are reflected immediately
  const task = currentTasks.find((t) => t.id === initialTask.id) || initialTask;
  const [submitLink, setSubmitLink] = useState(task.submittedLink || "");
  const [comment, setComment] = useState("");
  const [activeStatus, setActiveStatus] = useState<TaskStatus>(task.status);

  const assignee = currentMembers.find((m) => m.id === task.assigneeId);
  const project = currentProjects.find((p) => p.id === task.projectId);
  const priorityConf = PRIORITY_CONFIG[task.priority];
  const statusConf = STATUS_CONFIG[activeStatus];

  const handleSubmitLink = () => {
    if (submitLink.trim()) updateTask(task.id, { submittedLink: submitLink });
  };

  const handleComment = () => {
    if (comment.trim()) { addTaskComment(task.id, comment); setComment(""); }
  };

  const handleStatusChange = (s: TaskStatus) => { setActiveStatus(s); updateTask(task.id, { status: s }); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
        <div className="p-6 border-b" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: priorityConf.bg, color: priorityConf.color, fontWeight: 500 }}>
                  {priorityConf.label}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: statusConf.bg, color: statusConf.color, fontWeight: 500 }}>
                  {statusConf.label}
                </span>
                {project && <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: "#f3f4f6", color: "#6b7280" }}>{project.name}</span>}
              </div>
              <h2 style={{ color: "#111827", fontSize: "1.125rem" }}>{task.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "#9ca3af" }}><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {task.description && (
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 6 }}>Description</p>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.6 }}>{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 4 }}>Assignee</p>
              {assignee ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ background: getAvatarColor(assignee.name), fontWeight: 700 }}>
                    {assignee.avatar}
                  </div>
                  <span style={{ fontSize: "0.8125rem", color: "#374151" }}>{assignee.name}</span>
                </div>
              ) : <span style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>Unassigned</span>}
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 4 }}>Due Date</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: "#6b7280" }} />
                <span style={{ fontSize: "0.8125rem", color: "#374151" }}>{task.dueDate || "—"}</span>
              </div>
            </div>
          </div>

          {task.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
                <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Tags</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full" style={{ background: "#f3f4f6", color: "#374151", fontSize: "0.75rem" }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Status Change */}
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 8 }}>Update Status</p>
            <div className="flex gap-2">
              {(["todo", "in-progress", "completed"] as TaskStatus[]).map((s) => {
                const conf = STATUS_CONFIG[s];
                return (
                  <button key={s} onClick={() => handleStatusChange(s)}
                    className="flex-1 py-2 rounded-xl text-xs transition-all"
                    style={{ background: activeStatus === s ? conf.bg : "#f9f9f6", color: activeStatus === s ? conf.color : "#6b7280", fontWeight: activeStatus === s ? 600 : 400, border: `1.5px solid ${activeStatus === s ? conf.color : "transparent"}` }}>
                    {conf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Work Link */}
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 8 }}>Submit Work Link</p>
            <div className="flex gap-2">
              <input value={submitLink} onChange={(e) => setSubmitLink(e.target.value)}
                placeholder="https://your-work-link.com"
                className="flex-1 px-4 py-2.5 rounded-xl border outline-none"
                style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
              <button onClick={handleSubmitLink} className="px-4 py-2.5 rounded-xl transition-colors"
                style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
                Submit
              </button>
            </div>
            {task.submittedLink && (
              <a href={task.submittedLink} target="_blank" rel="noopener noreferrer"
                className="mt-2 block" style={{ fontSize: "0.75rem", color: "#3b82f6" }}>
                Current: {task.submittedLink}
              </a>
            )}
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" style={{ color: "#374151" }} />
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Comments ({task.comments.length})</p>
            </div>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {task.comments.length === 0 ? (
                <p style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>No comments yet. Be the first!</p>
              ) : task.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                    style={{ background: getAvatarColor(c.authorName), fontWeight: 700 }}>
                    {c.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 rounded-xl p-3" style={{ background: "#fafaf7" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>{c.authorName}
                      <span className="ml-2 font-normal" style={{ color: "#9ca3af" }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "#374151", marginTop: 2 }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={comment} onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Add a comment..." className="flex-1 px-4 py-2.5 rounded-xl border outline-none"
                style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
              <button onClick={handleComment} className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#f59e0b" }}>
                <Send className="w-4 h-4" style={{ color: "#111827" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type TabType = "all" | "active" | "completed";

export default function TasksPage() {
  const { currentTasks, currentProjects, currentMembers, deleteTask } = useApp();
  const [tab, setTab] = useState<TabType>("all");
  const [searchQ, setSearchQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showFilter, setShowFilter] = useState(false);

  const filtered = currentTasks.filter((t) => {
    const matchTab = tab === "all" ? true : tab === "active" ? t.status !== "completed" : t.status === "completed";
    const matchSearch = !searchQ || t.title.toLowerCase().includes(searchQ.toLowerCase()) || t.description.toLowerCase().includes(searchQ.toLowerCase());
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchTab && matchSearch && matchPriority;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>Tasks</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: 4 }}>
            {currentTasks.length} total tasks across {currentProjects.length} projects
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Tabs + Search + Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div className="flex rounded-xl p-1" style={{ background: "#f3f4f6" }}>
          {(["all", "active", "completed"] as TabType[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg capitalize transition-all"
              style={{
                background: tab === t ? "white" : "transparent",
                color: tab === t ? "#111827" : "#6b7280",
                fontWeight: tab === t ? 600 : 400,
                fontSize: "0.875rem",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
          <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border outline-none"
            style={{ borderColor: "#e5e5e0", background: "white", fontSize: "0.875rem" }} />
        </div>
        <div className="relative">
          <button onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors"
            style={{ borderColor: "#e5e5e0", background: "white", color: "#374151", fontSize: "0.875rem" }}>
            <Filter className="w-4 h-4" />
            Filter
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showFilter && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg z-20 p-2" style={{ borderColor: "#f0f0ea" }}>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", padding: "4px 8px", fontWeight: 600, textTransform: "uppercase" }}>Priority</p>
              {["all", "High", "Medium", "Low"].map((p) => (
                <button key={p} onClick={() => { setFilterPriority(p); setShowFilter(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                  style={{ fontSize: "0.875rem", color: filterPriority === p ? "#f59e0b" : "#374151", background: filterPriority === p ? "#fffbeb" : "transparent" }}>
                  {p === "all" ? "All Priorities" : p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: "#f0f0ea" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#fffbeb" }}>
            <CheckCircle className="w-8 h-8" style={{ color: "#f59e0b" }} />
          </div>
          <h3 style={{ color: "#111827", marginBottom: 8 }}>No tasks yet</h3>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: 20 }}>Create your first task!</p>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-xl" style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
            <Plus className="w-4 h-4 inline mr-2" />New Task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const assignee = currentMembers.find((m) => m.id === task.assigneeId);
            const project = currentProjects.find((p) => p.id === task.projectId);
            const priorityConf = PRIORITY_CONFIG[task.priority];
            const statusConf = STATUS_CONFIG[task.status];
            const StatusIcon = statusConf.icon;
            return (
              <div key={task.id} onClick={() => setSelectedTask(task)}
                className="bg-white rounded-2xl border p-4 flex items-center gap-4 cursor-pointer transition-all group"
                style={{ borderColor: "#f0f0ea" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#f59e0b"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#f0f0ea"}>
                <StatusIcon className="w-5 h-5 flex-shrink-0" style={{ color: statusConf.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p style={{ fontWeight: 500, color: "#111827", fontSize: "0.9375rem" }}>{task.title}</p>
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: priorityConf.bg, color: priorityConf.color, fontWeight: 500 }}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {project && <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{project.name}</span>}
                    {task.dueDate && (
                      <span className="flex items-center gap-1" style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        <Calendar className="w-3 h-3" />{task.dueDate}
                      </span>
                    )}
                    {task.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#f3f4f6", color: "#6b7280" }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {task.comments.length > 0 && (
                    <span className="flex items-center gap-1" style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      <MessageSquare className="w-3.5 h-3.5" />{task.comments.length}
                    </span>
                  )}
                  {assignee && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ background: getAvatarColor(assignee.name), fontWeight: 700 }}>
                      {assignee.avatar}
                    </div>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    style={{ color: "#ef4444" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fee2e2"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}
