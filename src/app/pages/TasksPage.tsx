import { useState } from "react";
import { useApp, Task, TaskPriority, TaskStatus } from "@/context/AppContext";
import {
  Plus, Search, Filter, CheckCircle, Clock, AlertCircle, MessageSquare,
  X, Send, ChevronDown, Tag, Pencil, Trash2, ExternalLink,
  ThumbsUp, ThumbsDown, Check, Save, Users, Calendar
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

// Helper — get assignee IDs from a task (supports legacy single assigneeId)
function getAssigneeIds(task: Task): string[] {
  if (task.assigneeIds?.length) return task.assigneeIds;
  if (task.assigneeId) return [task.assigneeId];
  return [];
}

// ── Multi-Assignee Picker ──────────────────────────────────────────────────────
function MultiAssigneePicker({
  selectedIds, onChange,
}: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const { currentMembers } = useApp();
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border outline-none text-left"
        style={{ borderColor: open ? "#f59e0b" : "#e5e7eb", background: "white", fontSize: "0.875rem" }}>
        <Users className="w-4 h-4 flex-shrink-0" style={{ color: "#9ca3af" }} />
        <span className="flex-1 truncate" style={{ color: selectedIds.length ? "#111827" : "#9ca3af" }}>
          {selectedIds.length === 0
            ? "Unassigned"
            : selectedIds.length === 1
              ? currentMembers.find((m) => m.id === selectedIds[0])?.name || "1 member"
              : `${selectedIds.length} members`}
        </span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#9ca3af" }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border bg-white shadow-lg z-20 p-2 max-h-48 overflow-y-auto"
          style={{ borderColor: "#f0f0ea" }}>
          {currentMembers.map((m) => {
            const checked = selectedIds.includes(m.id);
            return (
              <button key={m.id} type="button" onClick={() => toggle(m.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
                style={{ background: checked ? "#fffbeb" : "transparent" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: getAvatarColor(m.name) }}>{m.avatar}</div>
                <span className="flex-1 text-left" style={{ fontSize: "0.875rem", color: "#374151" }}>{m.name}</span>
                {checked && <Check className="w-4 h-4" style={{ color: "#f59e0b" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; label: string }> = {
  High: { color: "#ef4444", bg: "#fef2f2", label: "High" },
  Medium: { color: "#f59e0b", bg: "#fffbeb", label: "Medium" },
  Low: { color: "#10b981", bg: "#ecfdf5", label: "Low" },
};

const STATUS_CONFIG: Record<TaskStatus, { color: string; bg: string; icon: typeof CheckCircle; label: string }> = {
  completed: { color: "#10b981", bg: "#ecfdf5", icon: CheckCircle, label: "Completed" },
  "in-progress": { color: "#f59e0b", bg: "#fffbeb", icon: Clock, label: "In Progress" },
  todo: { color: "#6b7280", bg: "#f3f4f6", icon: AlertCircle, label: "To Do" },
};

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isOverdue(dueDate: string, status: TaskStatus) {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const { currentProjects, addTask } = useApp();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(currentProjects[0]?.id || "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ projectId, title, description, assigneeIds, assigneeId: assigneeIds[0], priority, status, dueDate, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), submissionStatus: undefined });
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
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle}>
              {currentProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Describe the task..." className="w-full px-4 py-2.5 rounded-xl border outline-none resize-none" style={inputStyle} />
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Assign To</label>
            <MultiAssigneePicker selectedIds={assigneeIds} onChange={setAssigneeIds} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle}>
                <option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <DatePicker value={dueDate} onChange={setDueDate} label="Due Date" placeholder="No deadline" />
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="design, frontend, urgent" className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle} />
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
  const { currentMembers, currentProjects, updateTask, deleteTask, addTaskComment, updateTaskComment, deleteTaskComment, currentUser, currentTasks } = useApp();
  const task = currentTasks.find((t) => t.id === initialTask.id) || initialTask;

  // Edit task state
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editAssigneeIds, setEditAssigneeIds] = useState(getAssigneeIds(task));
  const [editDueDate, setEditDueDate] = useState(task.dueDate);
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status);

  // Submit work
  const [submitLink, setSubmitLink] = useState(task.submittedLink || "");
  const [submitting, setSubmitting] = useState(false);

  // Comments
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const assignees = currentMembers.filter((m) => getAssigneeIds(task).includes(m.id));
  const project = currentProjects.find((p) => p.id === task.projectId);
  const overdue = isOverdue(task.dueDate, task.status);

  const handleSaveEdit = () => {
    updateTask(task.id, {
      title: editTitle,
      description: editDesc,
      priority: editPriority,
      assigneeIds: editAssigneeIds,
      assigneeId: editAssigneeIds[0],
      dueDate: editDueDate,
      status: editStatus,
    });
    setEditMode(false);
  };

  const handleSubmitLink = async () => {
    if (!submitLink.trim()) return;
    setSubmitting(true);
    await updateTask(task.id, { submittedLink: submitLink, submissionStatus: "pending" });
    setSubmitting(false);
  };

  const handleApproval = (status: "approved" | "rejected") => {
    updateTask(task.id, { submissionStatus: status });
  };

  const handleComment = () => {
    if (comment.trim()) { addTaskComment(task.id, comment); setComment(""); }
  };

  const handleStartEditComment = (id: string, content: string) => {
    setEditingCommentId(id);
    setEditingCommentText(content);
  };

  const handleSaveComment = (commentId: string) => {
    if (editingCommentText.trim()) {
      updateTaskComment(task.id, commentId, editingCommentText);
    }
    setEditingCommentId(null);
  };

  const handleDelete = () => {
    if (confirm("Delete this task?")) { deleteTask(task.id); onClose(); }
  };

  const priorityConf = PRIORITY_CONFIG[editMode ? editPriority : task.priority];
  const statusConf = STATUS_CONFIG[editMode ? editStatus : task.status];

  const submissionColors: Record<string, { bg: string; color: string }> = {
    pending: { bg: "#fffbeb", color: "#f59e0b" },
    approved: { bg: "#ecfdf5", color: "#10b981" },
    rejected: { bg: "#fef2f2", color: "#ef4444" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: priorityConf.bg, color: priorityConf.color, fontWeight: 500 }}>{priorityConf.label}</span>
                <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: statusConf.bg, color: statusConf.color, fontWeight: 500 }}>{statusConf.label}</span>
                {project && <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: "#f3f4f6", color: "#6b7280" }}>{project.name}</span>}
                {overdue && <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: "#fef2f2", color: "#ef4444", fontWeight: 600 }}>⚠ Overdue</span>}
              </div>
              {editMode ? (
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl border outline-none text-lg font-semibold" style={{ borderColor: "#f59e0b", color: "#111827" }} />
              ) : (
                <h2 style={{ color: "#111827", fontSize: "1.125rem" }}>{task.title}</h2>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setEditMode(!editMode)} className="p-2 rounded-xl" style={{ color: editMode ? "#f59e0b" : "#9ca3af" }} title="Edit task">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={handleDelete} className="p-2 rounded-xl" style={{ color: "#ef4444" }} title="Delete task">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "#9ca3af" }}><X className="w-5 h-5" /></button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Description */}
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 6 }}>Description</p>
            {editMode ? (
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-xl border outline-none resize-none"
                style={{ borderColor: "#e5e7eb", fontSize: "0.875rem", color: "#374151" }} />
            ) : task.description ? (
              <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{task.description}</p>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "#9ca3af", fontStyle: "italic" }}>No description</p>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 4 }}>Assignee</p>
              {editMode ? (
                <MultiAssigneePicker selectedIds={editAssigneeIds} onChange={setEditAssigneeIds} />
              ) : assignees.length > 0 ? (
                <div className="flex items-center gap-1 flex-wrap">
                  {assignees.map((a) => (
                    <div key={a.id} className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: getAvatarColor(a.name), fontWeight: 700 }}>{a.avatar}</div>
                      <span style={{ fontSize: "0.8125rem", color: "#374151" }}>{a.name}</span>
                    </div>
                  ))}
                </div>
              ) : <span style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>Unassigned</span>}
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 4 }}>Due Date</p>
              {editMode ? (
                <DatePicker value={editDueDate} onChange={setEditDueDate} placeholder="No deadline" />
              ) : (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" style={{ color: overdue ? "#ef4444" : "#6b7280" }} />
                  <span style={{ fontSize: "0.8125rem", color: overdue ? "#ef4444" : "#374151", fontWeight: overdue ? 600 : 400 }}>
                    {task.dueDate || "—"}
                    {overdue && " (Overdue)"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Edit mode: priority + status */}
          {editMode && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 4 }}>Priority</p>
                <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TaskPriority)} className="w-full px-3 py-1.5 rounded-xl border outline-none" style={{ fontSize: "0.8125rem", borderColor: "#e5e7eb" }}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 4 }}>Status</p>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as TaskStatus)} className="w-full px-3 py-1.5 rounded-xl border outline-none" style={{ fontSize: "0.8125rem", borderColor: "#e5e7eb" }}>
                  <option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
                </select>
              </div>
            </div>
          )}

          {editMode && (
            <button onClick={handleSaveEdit} className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2"
              style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
              <Save className="w-4 h-4" /> Save Changes
            </button>
          )}

          {/* Tags */}
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

          {/* Status change (when not in edit mode) */}
          {!editMode && (
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 8 }}>Update Status</p>
              <div className="flex gap-2">
                {(["todo", "in-progress", "completed"] as TaskStatus[]).map((s) => {
                  const conf = STATUS_CONFIG[s];
                  return (
                    <button key={s} onClick={() => updateTask(task.id, { status: s })}
                      className="flex-1 py-2 rounded-xl text-xs transition-all"
                      style={{ background: task.status === s ? conf.bg : "#f9f9f6", color: task.status === s ? conf.color : "#6b7280", fontWeight: task.status === s ? 600 : 400, border: `1.5px solid ${task.status === s ? conf.color : "transparent"}` }}>
                      {conf.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Work */}
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 8 }}>Submit Work</p>
            <div className="flex gap-2">
              <input value={submitLink} onChange={(e) => setSubmitLink(e.target.value)}
                placeholder="https://your-work-link.com"
                className="flex-1 px-4 py-2.5 rounded-xl border outline-none"
                style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
              <button onClick={handleSubmitLink} disabled={submitting || !submitLink.trim()}
                className="px-4 py-2.5 rounded-xl transition-colors"
                style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem", opacity: submitting ? 0.7 : 1 }}>
                Submit
              </button>
            </div>

            {task.submittedLink && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: "#fafaf7", border: "1px solid #f0f0ea" }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <a href={task.submittedLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:underline" style={{ fontSize: "0.8125rem" }}>
                    <ExternalLink className="w-3.5 h-3.5" /> View Submission
                  </a>
                  {task.submissionStatus && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                      style={{ background: submissionColors[task.submissionStatus]?.bg, color: submissionColors[task.submissionStatus]?.color }}>
                      {task.submissionStatus}
                    </span>
                  )}
                </div>

                {/* Approval actions */}
                {task.submissionStatus === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApproval("approved")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all"
                      style={{ background: "#ecfdf5", color: "#10b981", fontWeight: 600, fontSize: "0.8125rem", border: "1.5px solid #10b981" }}>
                      <ThumbsUp className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleApproval("rejected")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all"
                      style={{ background: "#fef2f2", color: "#ef4444", fontWeight: 600, fontSize: "0.8125rem", border: "1.5px solid #ef4444" }}>
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
                {task.submissionStatus === "rejected" && (
                  <button onClick={() => handleApproval("pending")} className="mt-2 text-xs" style={{ color: "#9ca3af" }}>
                    Reset to pending
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" style={{ color: "#374151" }} />
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Comments ({task.comments.length})</p>
            </div>
            <div className="space-y-3 mb-4 max-h-52 overflow-y-auto">
              {task.comments.length === 0 ? (
                <p style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>No comments yet. Be the first!</p>
              ) : task.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                    style={{ background: getAvatarColor(c.authorName), fontWeight: 700 }}>
                    {c.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 rounded-xl p-3" style={{ background: "#fafaf7" }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>
                        {c.authorName}
                        <span className="ml-2 font-normal" style={{ color: "#9ca3af" }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                          {c.editedAt && " (edited)"}
                        </span>
                      </p>
                      {currentUser?.id === c.authorId && (
                        <div className="flex gap-1">
                          <button onClick={() => handleStartEditComment(c.id, c.content)} style={{ color: "#9ca3af" }}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteTaskComment(task.id, c.id)} style={{ color: "#ef4444" }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {editingCommentId === c.id ? (
                      <div className="flex gap-2 mt-1">
                        <input value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)}
                          className="flex-1 px-2 py-1 rounded-lg border outline-none" style={{ fontSize: "0.8125rem", borderColor: "#e5e7eb" }} />
                        <button onClick={() => handleSaveComment(c.id)} style={{ color: "#10b981" }}><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingCommentId(null)} style={{ color: "#9ca3af" }}><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <p style={{ fontSize: "0.8125rem", color: "#374151", marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={comment} onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Add a comment..." className="flex-1 px-4 py-2.5 rounded-xl border outline-none"
                style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
              <button onClick={handleComment} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f59e0b" }}>
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
  const { currentTasks, currentProjects, currentMembers } = useApp();
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

  const overdueCount = currentTasks.filter((t) => isOverdue(t.dueDate, t.status)).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>Tasks</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: 4 }}>
            {currentTasks.length} total · {currentProjects.length} projects
            {overdueCount > 0 && <span style={{ color: "#ef4444", marginLeft: 8 }}>· {overdueCount} overdue</span>}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Tabs + Search + Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div className="flex rounded-xl p-1" style={{ background: "#f3f4f6" }}>
          {(["all", "active", "completed"] as TabType[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="px-4 py-1.5 rounded-lg capitalize transition-all"
              style={{ background: tab === t ? "white" : "transparent", color: tab === t ? "#111827" : "#6b7280", fontWeight: tab === t ? 600 : 400, fontSize: "0.875rem", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
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
          <button onClick={() => setShowFilter(!showFilter)} className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors"
            style={{ borderColor: filterPriority !== "all" ? "#f59e0b" : "#e5e5e0", background: filterPriority !== "all" ? "#fffbeb" : "white", color: filterPriority !== "all" ? "#f59e0b" : "#374151", fontSize: "0.875rem" }}>
            <Filter className="w-4 h-4" /> Filter {filterPriority !== "all" && `· ${filterPriority}`}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showFilter && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg z-20 p-2" style={{ borderColor: "#f0f0ea" }}>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", padding: "4px 8px", fontWeight: 600, textTransform: "uppercase" }}>Priority</p>
              {["all", "High", "Medium", "Low"].map((p) => (
                <button key={p} onClick={() => { setFilterPriority(p); setShowFilter(false); }} className="w-full text-left px-3 py-2 rounded-lg transition-colors"
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
          <h3 style={{ color: "#111827", marginBottom: 8 }}>No tasks found</h3>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: 20 }}>
            {currentTasks.length === 0 ? "Create your first task!" : "Try adjusting your filters."}
          </p>
          {currentTasks.length === 0 && (
            <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-xl"
              style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
              <Plus className="w-4 h-4 inline mr-2" />New Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const assignee = currentMembers.find((m) => m.id === task.assigneeId);
            const project = currentProjects.find((p) => p.id === task.projectId);
            const priorityConf = PRIORITY_CONFIG[task.priority];
            const statusConf = STATUS_CONFIG[task.status];
            const StatusIcon = statusConf.icon;
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <div key={task.id} onClick={() => setSelectedTask(task)}
                className="bg-white rounded-2xl border p-4 flex items-center gap-4 cursor-pointer transition-all"
                style={{ borderColor: overdue ? "#fecaca" : "#f0f0ea", background: overdue ? "#fffafa" : "white" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = overdue ? "#ef4444" : "#f59e0b"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = overdue ? "#fecaca" : "#f0f0ea"}>
                <StatusIcon className="w-5 h-5 flex-shrink-0" style={{ color: statusConf.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p style={{ fontWeight: 500, color: "#111827", fontSize: "0.9375rem" }}>{task.title}</p>
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: priorityConf.bg, color: priorityConf.color, fontWeight: 500 }}>{task.priority}</span>
                    {overdue && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#fef2f2", color: "#ef4444", fontWeight: 600 }}>Overdue</span>}
                    {task.submissionStatus && <span className="px-2 py-0.5 rounded-full text-xs capitalize" style={{ background: task.submissionStatus === "approved" ? "#ecfdf5" : task.submissionStatus === "rejected" ? "#fef2f2" : "#fffbeb", color: task.submissionStatus === "approved" ? "#10b981" : task.submissionStatus === "rejected" ? "#ef4444" : "#f59e0b", fontWeight: 500 }}>{task.submissionStatus}</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {project && <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{project.name}</span>}
                    {task.dueDate && (
                      <span className="flex items-center gap-1" style={{ fontSize: "0.75rem", color: overdue ? "#ef4444" : "#9ca3af" }}>
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
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs" style={{ background: getAvatarColor(assignee.name), fontWeight: 700 }}>
                      {assignee.avatar}
                    </div>
                  )}
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
