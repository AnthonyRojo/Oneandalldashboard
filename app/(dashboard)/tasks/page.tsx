"use client";

import { useState, useMemo, useEffect } from "react";
import { useApp, Task, TaskPriority, TaskStatus } from "@/context/AppContext";
import {
  Plus, Search, Filter, CheckCircle, Clock, AlertCircle, MessageSquare,
  X, ChevronDown, Tag, Trash2, Calendar, Link2,
  Send, ExternalLink, Check, XCircle, LayoutGrid, List, User, Layers,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

type ViewMode = "list" | "board";
type GroupBy = "none" | "project" | "assignee";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Low: "#22c55e",
  Medium: "#f59e0b",
  High: "#ef4444",
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  todo: { label: "To Do", icon: Clock, color: "#6b7280" },
  "in-progress": { label: "In Progress", icon: AlertCircle, color: "#3b82f6" },
  review: { label: "Review", icon: Clock, color: "#f59e0b" },
  completed: { label: "Completed", icon: CheckCircle, color: "#22c55e" },
};

const STATUSES = Object.keys(STATUS_CONFIG) as TaskStatus[];

function dueDateMeta(task: Task) {
  const now = Date.now();
  const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
  const isOverdue = due && due < now && task.status !== "completed";
  const isDueSoon = due && !isOverdue && due - now < 3 * 24 * 60 * 60 * 1000;
  return {
    isOverdue,
    isDueSoon,
    bg: isOverdue ? "#fee2e2" : isDueSoon ? "#fef3c7" : "#f3f4f6",
    color: isOverdue ? "#dc2626" : isDueSoon ? "#d97706" : "#6b7280",
  };
}

function getAssignees(task: Task, members: ReturnType<typeof useApp>["currentMembers"]) {
  return members.filter(
    (m) =>
      task.assigneeIds?.includes(m.id) ||
      (m.userId && task.assigneeIds?.includes(m.userId)) ||
      m.id === task.assigneeId ||
      (m.userId && m.userId === task.assigneeId)
  );
}

function AvatarStack({ assignees }: { assignees: { id: string; name: string }[] }) {
  if (assignees.length === 0)
    return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#9ca3af" }}>Unassigned</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {assignees.slice(0, 3).map((a) => (
          <div key={a.id} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white" style={{ background: "#e0e7ff", color: "#4338ca" }} title={a.name}>
            {a.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
        {assignees.length > 3 && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white" style={{ background: "#f3f4f6", color: "#6b7280" }}>+{assignees.length - 3}</div>
        )}
      </div>
      <span className="text-xs font-medium" style={{ color: "#374151" }}>
        {assignees.length === 1 ? assignees[0].name : `${assignees.length} assignees`}
      </span>
    </div>
  );
}

// ── Task Detail Drawer ─────────────────────────────────────────────────────────
function TaskDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const {
    currentTasks, currentMembers, currentProjects, currentUser,
    updateTask, deleteTask, addTaskComment, updateTaskComment, deleteTaskComment,
  } = useApp();

  const task = currentTasks.find((t) => t.id === taskId);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "comments">("details");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittedLinkInput, setSubmittedLinkInput] = useState("");
  const [approvalFeedback, setApprovalFeedback] = useState<boolean | null>(null);
  const [newTag, setNewTag] = useState("");

  // Reset form when a different task is opened
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setIsDirty(false);
      setNewComment("");
      setEditingCommentId(null);
      setActiveTab("details");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!task) return null;

  const assignees = getAssignees(task, currentMembers);
  const userMember = currentMembers.find((m) => m.id === currentUser?.id || m.userId === currentUser?.id);
  const canApprove = userMember?.role?.toLowerCase() === "owner" || userMember?.role?.toLowerCase() === "admin";
  const { isOverdue } = dueDateMeta(task);

  const handleSave = async () => {
    await updateTask(task.id, { title: title.trim() || task.title, description });
    setIsDirty(false);
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${task.title}"?`)) {
      await deleteTask(task.id);
      onClose();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addTaskComment(task.id, newComment);
    setNewComment("");
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;
    await updateTaskComment(task.id, commentId, editingCommentContent);
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const handleApprove = async (approved: boolean) => {
    await updateTask(task.id, { submissionStatus: approved ? "approved" : "rejected", status: approved ? "completed" : "in-progress" });
    setApprovalFeedback(approved);
    setTimeout(() => setApprovalFeedback(null), 2000);
  };

  const handleSubmitLink = async () => {
    if (!submittedLinkInput.trim()) return;
    await updateTask(task.id, { submittedLink: submittedLinkInput.trim(), submissionStatus: "pending" });
    setSubmittedLinkInput("");
  };

  const toggleAssignee = (memberId: string, isAssigned: boolean) => {
    const current = task.assigneeIds || [];
    const updated = isAssigned ? current.filter((id) => id !== memberId) : [...current, memberId];
    updateTask(task.id, { assigneeIds: updated });
  };

  return (
    <div className="flex flex-col bg-white flex-shrink-0 h-full border-l" style={{ width: 420, borderColor: "#e5e7eb" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ background: STATUS_CONFIG[task.status].color }} />
            <span className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color: "#9ca3af" }}>
              {STATUS_CONFIG[task.status].label}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleDelete} className="p-1.5 rounded-lg transition-colors hover:bg-red-50">
              <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-gray-100">
              <X className="w-4 h-4" style={{ color: "#6b7280" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
        {(["details", "comments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 text-sm font-medium capitalize"
            style={{
              color: activeTab === tab ? "#f59e0b" : "#6b7280",
              borderBottom: activeTab === tab ? "2px solid #f59e0b" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab}
            {tab === "comments" && (task.comments?.length ?? 0) > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                {task.comments!.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Details tab ─────────────────────────────────────────────────── */}
        {activeTab === "details" && (
          <div className="p-5 space-y-5">
            {/* Title + Description (with Save) */}
            <div>
              <input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                className="w-full text-lg font-semibold outline-none bg-transparent border-b-2 pb-1 transition-colors"
                style={{ color: "#111827", borderColor: isDirty ? "#f59e0b" : "#f0f0ea" }}
              />
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
                placeholder="Add description..."
                className="w-full mt-3 text-sm outline-none bg-transparent resize-none"
                style={{ color: "#6b7280", lineHeight: 1.6, minHeight: 56 }}
                rows={3}
              />
              {isDirty && (
                <button onClick={handleSave} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "#f59e0b", color: "#111827" }}>
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
              )}
            </div>

            {/* Metadata rows */}
            <div className="space-y-2.5">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold w-24 flex-shrink-0 uppercase tracking-wide" style={{ color: "#9ca3af" }}>Status</span>
                <select
                  value={task.status}
                  onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border text-sm outline-none font-medium"
                  style={{ borderColor: "#e5e7eb", color: STATUS_CONFIG[task.status].color }}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
              {/* Priority */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold w-24 flex-shrink-0 uppercase tracking-wide" style={{ color: "#9ca3af" }}>Priority</span>
                <select
                  value={task.priority}
                  onChange={(e) => updateTask(task.id, { priority: e.target.value as TaskPriority })}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border text-sm outline-none font-medium"
                  style={{ borderColor: "#e5e7eb", color: PRIORITY_COLORS[task.priority] }}
                >
                  {(["Low", "Medium", "High"] as TaskPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {/* Due Date */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold w-24 flex-shrink-0 uppercase tracking-wide" style={{ color: "#9ca3af" }}>Due Date</span>
                <input
                  type="date"
                  value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => updateTask(task.id, { dueDate: e.target.value || "" })}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "#e5e7eb", color: isOverdue ? "#dc2626" : "#374151" }}
                />
              </div>
              {/* Project */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold w-24 flex-shrink-0 uppercase tracking-wide" style={{ color: "#9ca3af" }}>Project</span>
                <select
                  value={task.projectId || ""}
                  onChange={(e) => updateTask(task.id, { projectId: e.target.value })}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}
                >
                  <option value="">No project</option>
                  {currentProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* Assignees */}
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold w-24 flex-shrink-0 uppercase tracking-wide pt-1" style={{ color: "#9ca3af" }}>Assignees</span>
                <div className="flex-1 space-y-1">
                  {currentMembers.map((m) => {
                    const memberId = m.userId || m.id;
                    const isAssigned = task.assigneeIds?.includes(memberId) || task.assigneeIds?.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!isAssigned}
                          onChange={() => toggleAssignee(memberId, !!isAssigned)}
                          className="rounded"
                        />
                        <span className="text-sm" style={{ color: "#374151" }}>{m.name}</span>
                        <span className="text-xs" style={{ color: "#9ca3af" }}>{m.role}</span>
                      </label>
                    );
                  })}
                  {currentMembers.length === 0 && <p className="text-xs" style={{ color: "#9ca3af" }}>No members</p>}
                </div>
              </div>
              {/* Tags */}
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold w-24 flex-shrink-0 uppercase tracking-wide pt-1" style={{ color: "#9ca3af" }}>Tags</span>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(task.tags || []).map((t) => (
                      <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: "#f3f4f6", color: "#374151" }}>
                        {t}
                        <button onClick={() => updateTask(task.id, { tags: task.tags?.filter((x) => x !== t) || [] })}>
                          <X className="w-2.5 h-2.5" style={{ color: "#9ca3af" }} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTag.trim()) {
                          updateTask(task.id, { tags: [...(task.tags || []), newTag.trim()] });
                          setNewTag("");
                        }
                      }}
                      placeholder="Add tag..."
                      className="flex-1 px-2.5 py-1 rounded-lg border text-xs outline-none"
                      style={{ borderColor: "#e5e7eb" }}
                    />
                    <button
                      onClick={() => { if (newTag.trim()) { updateTask(task.id, { tags: [...(task.tags || []), newTag.trim()] }); setNewTag(""); } }}
                      className="px-2.5 py-1 rounded-lg text-xs"
                      style={{ background: "#f3f4f6", color: "#374151" }}
                    >Add</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission section */}
            <div className="border-t pt-4" style={{ borderColor: "#f0f0ea" }}>
              <h4 className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: "#374151" }}>
                <Link2 className="w-4 h-4" /> Submission
              </h4>
              {task.submittedLink ? (
                <div className="p-3 rounded-xl" style={{ background: "#f9fafb" }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <a href={task.submittedLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs hover:underline truncate" style={{ color: "#3b82f6" }}>
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{task.submittedLink}</span>
                    </a>
                    {task.submissionStatus && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0" style={{ background: task.submissionStatus === "approved" ? "#dcfce7" : task.submissionStatus === "rejected" ? "#fee2e2" : "#fef3c7", color: task.submissionStatus === "approved" ? "#16a34a" : task.submissionStatus === "rejected" ? "#dc2626" : "#d97706" }}>
                        {task.submissionStatus}
                      </span>
                    )}
                  </div>
                  {task.submissionStatus === "pending" && canApprove && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleApprove(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#22c55e" }}><Check className="w-4 h-4" /> Approve</button>
                      <button onClick={() => handleApprove(false)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#ef4444" }}><XCircle className="w-4 h-4" /> Reject</button>
                    </div>
                  )}
                  {task.submissionStatus === "pending" && !canApprove && (
                    <p className="mt-2 text-xs" style={{ color: "#9ca3af" }}>Only admins can approve.</p>
                  )}
                  {approvalFeedback !== null && (
                    <p className="mt-2 text-xs font-medium" style={{ color: approvalFeedback ? "#16a34a" : "#dc2626" }}>
                      {approvalFeedback ? "Approved!" : "Rejected!"}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={submittedLinkInput}
                    onChange={(e) => setSubmittedLinkInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitLink()}
                    placeholder="Paste submission link..."
                    className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "#e5e7eb" }}
                  />
                  <button onClick={handleSubmitLink} className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "#f59e0b", color: "#111827" }}>Submit</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Comments tab ────────────────────────────────────────────────── */}
        {activeTab === "comments" && (
          <div className="p-5 space-y-3">
            {(task.comments?.length ?? 0) === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: "#9ca3af" }}>No comments yet</p>
            )}
            {task.comments?.map((c) => (
              <div key={c.id} className="p-3 rounded-xl" style={{ background: "#f9fafb" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "#111827" }}>{c.authorName}</span>
                    <span className="text-xs" style={{ color: "#9ca3af" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  {c.authorId === currentUser?.id && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingCommentId(c.id); setEditingCommentContent(c.content); }} className="p-1 rounded hover:bg-gray-200">
                        <svg className="w-3 h-3" style={{ color: "#6b7280" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => deleteTaskComment(task.id, c.id)} className="p-1 rounded hover:bg-red-100">
                        <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
                      </button>
                    </div>
                  )}
                </div>
                {editingCommentId === c.id ? (
                  <div className="flex gap-2 mt-2">
                    <input value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border text-sm outline-none" style={{ borderColor: "#e5e7eb" }} />
                    <button onClick={() => handleEditComment(c.id)} className="px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: "#f59e0b" }}>Save</button>
                    <button onClick={() => setEditingCommentId(null)} className="px-2 py-1.5 rounded-lg text-sm" style={{ background: "#f3f4f6" }}>✕</button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm" style={{ color: "#6b7280" }}>{c.content}</p>
                    <button onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)} className="text-xs mt-1 font-medium" style={{ color: "#3b82f6" }}>
                      {replyingToId === c.id ? "Cancel" : "Reply"}
                    </button>
                    {replyingToId === c.id && (
                      <div className="flex gap-2 mt-2">
                        <input value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && replyContent.trim()) {
                              await addTaskComment(task.id, `@${c.authorName} ${replyContent}`);
                              setReplyContent(""); setReplyingToId(null);
                            }
                          }}
                          placeholder="Reply..." className="flex-1 px-3 py-1.5 rounded-lg border text-sm outline-none" style={{ borderColor: "#e5e7eb" }} />
                        <button onClick={async () => { if (replyContent.trim()) { await addTaskComment(task.id, `@${c.authorName} ${replyContent}`); setReplyContent(""); setReplyingToId(null); } }}
                          className="p-1.5 rounded-lg" style={{ background: "#3b82f6", color: "white" }}>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* New comment */}
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "#f0f0ea" }}>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ borderColor: "#e5e7eb" }}
              />
              <button onClick={handleAddComment} disabled={!newComment.trim()} className="p-2 rounded-xl flex-shrink-0" style={{ background: newComment.trim() ? "#f59e0b" : "#f3f4f6" }}>
                <Send className="w-4 h-4" style={{ color: newComment.trim() ? "#111827" : "#9ca3af" }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const {
    currentUser, currentTasks, currentMembers, currentProjects,
    addTask, updateTask, deleteTask,
  } = useApp();

  // View / filter state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [showMyWork, setShowMyWork] = useState(false);
  const [showGroupByDropdown, setShowGroupByDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Inline editing state (cards)
  const [inlineStatusTaskId, setInlineStatusTaskId] = useState<string | null>(null);
  const [inlinePriorityTaskId, setInlinePriorityTaskId] = useState<string | null>(null);

  // Drag state (board view)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  // Drawer
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkPriorityOpen, setBulkPriorityOpen] = useState(false);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "", description: "", priority: "Medium" as TaskPriority, status: "todo" as TaskStatus,
    assigneeIds: [] as string[], projectId: "", dueDate: "", tags: [] as string[], submittedLink: "", approverId: "",
  });
  const [newTag, setNewTag] = useState("");

  const userMember = currentMembers.find((m) => m.id === currentUser?.id || m.userId === currentUser?.id);

  const closeInline = () => { setInlineStatusTaskId(null); setInlinePriorityTaskId(null); };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const uid = currentUser?.id;
    return currentTasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesMyWork = !showMyWork || !uid ||
        task.assigneeIds?.includes(uid) || task.assigneeId === uid ||
        (userMember && (task.assigneeIds?.includes(userMember.id) || task.assigneeId === userMember.id));
      return matchesSearch && matchesStatus && matchesPriority && matchesMyWork;
    });
  }, [currentTasks, searchQuery, statusFilter, priorityFilter, showMyWork, currentUser, userMember]);

  // ── Grouping ───────────────────────────────────────────────────────────────
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: null as string | null, tasks: filteredTasks }];
    if (groupBy === "project") {
      const groups: Record<string, Task[]> = {};
      filteredTasks.forEach((task) => {
        const key = currentProjects.find((p) => p.id === task.projectId)?.name || "No Project";
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
      });
      return Object.entries(groups).map(([label, tasks]) => ({ key: label, label, tasks }));
    }
    if (groupBy === "assignee") {
      const groups: Record<string, Task[]> = {};
      filteredTasks.forEach((task) => {
        const assignees = getAssignees(task, currentMembers);
        const key = assignees.length > 0 ? assignees[0].name : "Unassigned";
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
      });
      return Object.entries(groups).map(([label, tasks]) => ({ key: label, label, tasks }));
    }
    return [{ key: "all", label: null as string | null, tasks: filteredTasks }];
  }, [filteredTasks, groupBy, currentProjects, currentMembers]);

  // ── Bulk ops ───────────────────────────────────────────────────────────────
  const bulkSetStatus = async (status: TaskStatus) => {
    await Promise.all([...selectedIds].map((id) => updateTask(id, { status })));
    setSelectedIds(new Set());
    setBulkStatusOpen(false);
  };

  const bulkSetPriority = async (priority: TaskPriority) => {
    await Promise.all([...selectedIds].map((id) => updateTask(id, { priority })));
    setSelectedIds(new Set());
    setBulkPriorityOpen(false);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} task(s)?`)) return;
    await Promise.all([...selectedIds].map((id) => deleteTask(id)));
    setSelectedIds(new Set());
    if (drawerTaskId && selectedIds.has(drawerTaskId)) setDrawerTaskId(null);
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    await addTask({ ...newTask, assigneeIds: newTask.assigneeIds.length > 0 ? newTask.assigneeIds : currentUser?.id ? [currentUser.id] : [] });
    setShowCreateModal(false);
    setNewTask({ title: "", description: "", priority: "Medium", status: "todo", assigneeIds: [], projectId: "", dueDate: "", tags: [], submittedLink: "", approverId: "" });
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Task Card ─────────────────────────────────────────────────────────────
  function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
    const assignees = getAssignees(task, currentMembers);
    const { isOverdue, bg: dueBg, color: dueColor } = dueDateMeta(task);
    const StatusIcon = STATUS_CONFIG[task.status].icon;
    const isSelected = selectedIds.has(task.id);
    const isDrawerOpen = drawerTaskId === task.id;

    return (
      <div
        className={`rounded-xl border cursor-pointer transition-all hover:shadow-md relative ${compact ? "p-3" : "p-4"}`}
        style={{
          background: isDrawerOpen ? "#fffbeb" : "white",
          borderColor: isDrawerOpen ? "#f59e0b" : isOverdue ? "#fca5a5" : isSelected ? "#a5b4fc" : "#e5e7eb",
          opacity: draggedTaskId === task.id ? 0.4 : 1,
        }}
        draggable={viewMode === "board"}
        onDragStart={(e) => { e.dataTransfer.setData("taskId", task.id); setDraggedTaskId(task.id); }}
        onDragEnd={() => { setDraggedTaskId(null); setDragOverStatus(null); }}
        onClick={() => { closeInline(); setDrawerTaskId(task.id === drawerTaskId ? null : task.id); }}
      >
        {(inlineStatusTaskId === task.id || inlinePriorityTaskId === task.id) && (
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); closeInline(); }} />
        )}

        <div className={`flex items-start ${compact ? "gap-2" : "gap-3"}`}>
          {/* Checkbox */}
          <div
            className="flex-shrink-0 mt-0.5"
            onClick={(e) => toggleSelect(task.id, e)}
            title="Select task"
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected ? "border-indigo-500 bg-indigo-500" : "border-gray-300 hover:border-indigo-400"}`}>
              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
          </div>

          {/* Status icon */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 relative hover:ring-2 hover:ring-offset-1"
            style={{ background: `${STATUS_CONFIG[task.status].color}20` }}
            onClick={(e) => { e.stopPropagation(); setInlineStatusTaskId(inlineStatusTaskId === task.id ? null : task.id); setInlinePriorityTaskId(null); }}
            title="Change status"
          >
            <StatusIcon className="w-3.5 h-3.5" style={{ color: STATUS_CONFIG[task.status].color }} />
            {inlineStatusTaskId === task.id && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-xl z-20 min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
                {STATUSES.map((s) => {
                  const SIcon = STATUS_CONFIG[s].icon;
                  return (
                    <button key={s} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl"
                      style={{ color: STATUS_CONFIG[s].color, fontWeight: task.status === s ? 600 : 400 }}
                      onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: s }); closeInline(); }}>
                      <SIcon className="w-3.5 h-3.5" />{STATUS_CONFIG[s].label}
                      {task.status === s && <Check className="w-3 h-3 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`font-medium ${compact ? "text-sm" : ""}`} style={{ color: "#111827" }}>{task.title}</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 cursor-pointer hover:opacity-80 relative"
                style={{ background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}
                onClick={(e) => { e.stopPropagation(); setInlinePriorityTaskId(inlinePriorityTaskId === task.id ? null : task.id); setInlineStatusTaskId(null); }}
              >
                {task.priority}
                {inlinePriorityTaskId === task.id && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-xl z-20 min-w-[120px]" style={{ borderColor: "#e5e7eb" }}>
                    {(["Low", "Medium", "High"] as TaskPriority[]).map((p) => (
                      <button key={p} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between first:rounded-t-xl last:rounded-b-xl"
                        style={{ color: PRIORITY_COLORS[p], fontWeight: task.priority === p ? 600 : 400 }}
                        onClick={(e) => { e.stopPropagation(); updateTask(task.id, { priority: p }); closeInline(); }}>
                        {p}{task.priority === p && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </span>
              {(task.submissionStatus === "pending" || task.submissionStatus === "approved" || task.submissionStatus === "rejected") && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                  style={{ background: task.submissionStatus === "approved" ? "#dcfce7" : task.submissionStatus === "rejected" ? "#fee2e2" : "#fef3c7", color: task.submissionStatus === "approved" ? "#16a34a" : task.submissionStatus === "rejected" ? "#dc2626" : "#d97706" }}>
                  {task.submissionStatus}
                </span>
              )}
            </div>
            {!compact && task.description && (
              <p className="text-sm line-clamp-2 mb-3" style={{ color: "#6b7280" }}>{task.description}</p>
            )}
            <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
              <AvatarStack assignees={assignees} />
              <div className="flex items-center gap-2">
                {!compact && (task.comments?.length ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#9ca3af" }}>
                    <MessageSquare className="w-3 h-3" />{task.comments!.length}
                  </span>
                )}
                {task.submittedLink && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                    <Link2 className="w-3 h-3" />
                  </span>
                )}
                {task.dueDate && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: dueBg, color: dueColor }}>
                    <Calendar className="w-3 h-3" />{new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Board view ─────────────────────────────────────────────────────────────
  function BoardView() {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const colTasks = filteredTasks.filter((t) => t.status === status);
          const isOver = dragOverStatus === status;
          return (
            <div key={status} className="flex-shrink-0 w-72 flex flex-col rounded-2xl"
              style={{ background: isOver ? `${STATUS_CONFIG[status].color}10` : "#f3f4f6", border: isOver ? `2px solid ${STATUS_CONFIG[status].color}` : "2px solid transparent", transition: "border 0.15s, background 0.15s" }}
              onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("taskId"); if (id) updateTask(id, { status }); setDraggedTaskId(null); setDragOverStatus(null); }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_CONFIG[status].color }} />
                  <span className="font-semibold text-sm" style={{ color: "#374151" }}>{STATUS_CONFIG[status].label}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${STATUS_CONFIG[status].color}20`, color: STATUS_CONFIG[status].color }}>{colTasks.length}</span>
              </div>
              <div className="flex flex-col gap-2 px-3 pb-3 flex-1 min-h-[60px]">
                {colTasks.map((task) => <TaskCard key={task.id} task={task} compact />)}
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed" style={{ borderColor: "#d1d5db", color: "#9ca3af" }}>
                    <span className="text-xs">Drop here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  function ListView() {
    return (
      <div className="space-y-6">
        {groupedTasks.map(({ key, label, tasks }) => (
          <div key={key}>
            {label && (
              <button className="flex items-center gap-2 mb-3 w-full text-left" onClick={() => toggleGroup(key)}>
                <ChevronDown className="w-4 h-4 transition-transform" style={{ color: "#6b7280", transform: collapsedGroups.has(key) ? "rotate(-90deg)" : "rotate(0deg)" }} />
                <span className="font-semibold text-sm" style={{ color: "#374151" }}>{label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#e5e7eb", color: "#6b7280" }}>{tasks.length}</span>
              </button>
            )}
            {!collapsedGroups.has(key) && (
              <div className="grid gap-3">
                {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
                {tasks.length === 0 && <p className="text-center py-8" style={{ color: "#9ca3af" }}>No tasks</p>}
              </div>
            )}
          </div>
        ))}
        {filteredTasks.length === 0 && <div className="text-center py-12"><p style={{ color: "#6b7280" }}>No tasks found</p></div>}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#fafaf7", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header + toolbar */}
      <div style={{ padding: "24px 24px 0", flexShrink: 0 }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Tasks</h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}{showMyWork && " · My Work"}
              {selectedIds.size > 0 && <span style={{ color: "#4338ca" }}> · {selectedIds.size} selected</span>}
            </p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium" style={{ background: "#f59e0b", color: "white" }}>
            <Plus className="w-4 h-4" />New Task
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
            <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb", background: "white" }} />
          </div>

          <div className="relative">
            <button onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowPriorityDropdown(false); setShowGroupByDropdown(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border"
              style={{ borderColor: statusFilter !== "all" ? "#f59e0b" : "#e5e7eb", background: statusFilter !== "all" ? "#fef3c7" : "white" }}>
              <Filter className="w-4 h-4" style={{ color: "#6b7280" }} />
              {statusFilter === "all" ? "Status" : STATUS_CONFIG[statusFilter].label}
              <ChevronDown className="w-4 h-4" style={{ color: "#6b7280" }} />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-white border rounded-xl shadow-lg z-10 min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
                <button onClick={() => { setStatusFilter("all"); setShowStatusDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-xl text-sm">All Status</button>
                {STATUSES.map((s) => <button key={s} onClick={() => { setStatusFilter(s); setShowStatusDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 last:rounded-b-xl text-sm">{STATUS_CONFIG[s].label}</button>)}
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setShowPriorityDropdown(!showPriorityDropdown); setShowStatusDropdown(false); setShowGroupByDropdown(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border"
              style={{ borderColor: priorityFilter !== "all" ? "#f59e0b" : "#e5e7eb", background: priorityFilter !== "all" ? "#fef3c7" : "white" }}>
              <Tag className="w-4 h-4" style={{ color: "#6b7280" }} />
              {priorityFilter === "all" ? "Priority" : priorityFilter}
              <ChevronDown className="w-4 h-4" style={{ color: "#6b7280" }} />
            </button>
            {showPriorityDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-white border rounded-xl shadow-lg z-10 min-w-[130px]" style={{ borderColor: "#e5e7eb" }}>
                <button onClick={() => { setPriorityFilter("all"); setShowPriorityDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-xl text-sm">All</button>
                {(["Low", "Medium", "High"] as TaskPriority[]).map((p) => <button key={p} onClick={() => { setPriorityFilter(p); setShowPriorityDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 last:rounded-b-xl text-sm">{p}</button>)}
              </div>
            )}
          </div>

          <div className="w-px self-stretch" style={{ background: "#e5e7eb" }} />

          <button onClick={() => setShowMyWork(!showMyWork)} className="flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm"
            style={{ borderColor: showMyWork ? "#4338ca" : "#e5e7eb", background: showMyWork ? "#e0e7ff" : "white", color: showMyWork ? "#4338ca" : "#374151" }}>
            <User className="w-4 h-4" />My Work
          </button>

          {viewMode === "list" && (
            <div className="relative">
              <button onClick={() => { setShowGroupByDropdown(!showGroupByDropdown); setShowStatusDropdown(false); setShowPriorityDropdown(false); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: groupBy !== "none" ? "#4338ca" : "#e5e7eb", background: groupBy !== "none" ? "#e0e7ff" : "white", color: groupBy !== "none" ? "#4338ca" : "#374151" }}>
                <Layers className="w-4 h-4" />{groupBy === "none" ? "Group by" : `By ${groupBy}`}<ChevronDown className="w-4 h-4" />
              </button>
              {showGroupByDropdown && (
                <div className="absolute top-full mt-1 right-0 bg-white border rounded-xl shadow-lg z-10 min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
                  {([["none", "None"], ["project", "Project"], ["assignee", "Assignee"]] as [GroupBy, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => { setGroupBy(val); setShowGroupByDropdown(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center justify-between first:rounded-t-xl last:rounded-b-xl" style={{ color: "#374151" }}>
                      {label}{groupBy === val && <Check className="w-3 h-3" style={{ color: "#4338ca" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
            <button onClick={() => setViewMode("list")} className="flex items-center gap-1.5 px-3 py-2 text-sm"
              style={{ background: viewMode === "list" ? "#f59e0b" : "white", color: viewMode === "list" ? "white" : "#6b7280" }}>
              <List className="w-4 h-4" />List
            </button>
            <button onClick={() => setViewMode("board")} className="flex items-center gap-1.5 px-3 py-2 text-sm border-l"
              style={{ background: viewMode === "board" ? "#f59e0b" : "white", color: viewMode === "board" ? "white" : "#6b7280", borderColor: "#e5e7eb" }}>
              <LayoutGrid className="w-4 h-4" />Board
            </button>
          </div>
        </div>
      </div>

      {/* Main area: task list + drawer */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
          {viewMode === "board" ? <BoardView /> : <ListView />}
        </div>
        {drawerTaskId && <TaskDrawer taskId={drawerTaskId} onClose={() => setDrawerTaskId(null)} />}
      </div>

      {/* ── Bulk action bar ────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl"
          style={{ transform: "translateX(-50%)", background: "#111827" }}>
          <span className="text-sm font-semibold text-white">{selectedIds.size} selected</span>
          <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.2)" }} />

          {/* Bulk status */}
          <div className="relative">
            <button onClick={() => { setBulkStatusOpen(!bulkStatusOpen); setBulkPriorityOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.1)", color: "white" }}>
              Status <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {bulkStatusOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-white border rounded-xl shadow-xl min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => bulkSetStatus(s)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl flex items-center gap-2"
                    style={{ color: STATUS_CONFIG[s].color }}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk priority */}
          <div className="relative">
            <button onClick={() => { setBulkPriorityOpen(!bulkPriorityOpen); setBulkStatusOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.1)", color: "white" }}>
              Priority <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {bulkPriorityOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-white border rounded-xl shadow-xl min-w-[120px]" style={{ borderColor: "#e5e7eb" }}>
                {(["Low", "Medium", "High"] as TaskPriority[]).map((p) => (
                  <button key={p} onClick={() => bulkSetPriority(p)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                    style={{ color: PRIORITY_COLORS[p] }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk delete */}
          <button onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "#dc2626", color: "white" }}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>

          <button onClick={() => setSelectedIds(new Set())} className="ml-1 p-1 rounded-lg" style={{ color: "rgba(255,255,255,0.6)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Create Task Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Create Task</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Title</label>
                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb" }} placeholder="Task title" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Description</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border resize-none outline-none" style={{ borderColor: "#e5e7eb" }} rows={3} placeholder="Task description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Priority</label>
                  <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })} className="w-full px-4 py-2 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb" }}>
                    <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Project</label>
                  <select value={newTask.projectId} onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })} className="w-full px-4 py-2 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb" }}>
                    <option value="">No project</option>
                    {currentProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Assignees</label>
                <div className="space-y-2 border rounded-xl p-3" style={{ borderColor: "#e5e7eb" }}>
                  {currentMembers.map((m) => {
                    const memberId = m.userId || m.id;
                    return (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={newTask.assigneeIds.includes(memberId)} onChange={(e) => setNewTask({ ...newTask, assigneeIds: e.target.checked ? [...newTask.assigneeIds, memberId] : newTask.assigneeIds.filter((id) => id !== memberId) })} className="rounded" />
                        <span style={{ color: "#374151" }}>{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <DatePicker label="Due Date" value={newTask.dueDate} onChange={(date) => setNewTask({ ...newTask, dueDate: date })} />
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newTask.tags.map((t) => (
                    <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm" style={{ background: "#f3f4f6" }}>
                      {t}<button onClick={() => setNewTask({ ...newTask, tags: newTask.tags.filter((x) => x !== t) })}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newTag.trim()) { setNewTask({ ...newTask, tags: [...newTask.tags, newTag.trim()] }); setNewTag(""); } }}
                    className="flex-1 px-4 py-2 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb" }} placeholder="Add tag" />
                  <button onClick={() => { if (newTag.trim()) { setNewTask({ ...newTask, tags: [...newTask.tags, newTag.trim()] }); setNewTag(""); } }} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Add</button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Cancel</button>
              <button onClick={handleCreateTask} disabled={!newTask.title.trim()} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b", opacity: newTask.title.trim() ? 1 : 0.6 }}>Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
