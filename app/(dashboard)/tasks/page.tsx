"use client";

import { useState, useMemo } from "react";
import { useApp, Task, TaskPriority, TaskStatus } from "@/context/AppContext";
import {
  Plus, Search, Filter, CheckCircle, Clock, AlertCircle, MessageSquare,
  X, ChevronDown, Tag, Pencil, Trash2, Calendar, Link2,
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
    return (
      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#9ca3af" }}>
        Unassigned
      </span>
    );
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {assignees.slice(0, 3).map((a) => (
          <div
            key={a.id}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white"
            style={{ background: "#e0e7ff", color: "#4338ca" }}
            title={a.name}
          >
            {a.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
        {assignees.length > 3 && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white"
            style={{ background: "#f3f4f6", color: "#6b7280" }}
          >
            +{assignees.length - 3}
          </div>
        )}
      </div>
      <span className="text-xs font-medium" style={{ color: "#374151" }}>
        {assignees.length === 1 ? assignees[0].name : `${assignees.length} assignees`}
      </span>
    </div>
  );
}

export default function TasksPage() {
  const {
    currentUser,
    currentTasks,
    currentMembers,
    currentProjects,
    addTask,
    updateTask,
    deleteTask,
    addTaskComment,
    updateTaskComment,
    deleteTaskComment,
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

  // Inline editing state
  const [inlineStatusTaskId, setInlineStatusTaskId] = useState<string | null>(null);
  const [inlinePriorityTaskId, setInlinePriorityTaskId] = useState<string | null>(null);

  // Drag state (board view)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [resolvedComments, setResolvedComments] = useState<Set<string>>(new Set());
  const [approvalFeedback, setApprovalFeedback] = useState<{ taskId: string; approved: boolean } | null>(null);

  // New task form
  const [newTask, setNewTask] = useState({
    title: "", description: "", priority: "Medium" as TaskPriority, status: "todo" as TaskStatus,
    assigneeIds: [] as string[], projectId: "", dueDate: "", tags: [] as string[], submittedLink: "", approverId: "",
  });
  const [newTag, setNewTag] = useState("");

  // Edit task form
  const [editForm, setEditForm] = useState({
    title: "", description: "", priority: "Medium" as TaskPriority, status: "todo" as TaskStatus,
    assigneeIds: [] as string[], projectId: "", dueDate: "", tags: [] as string[], submittedLink: "", approverId: "",
  });
  const [editTag, setEditTag] = useState("");

  const userMember = currentMembers.find((m) => m.id === currentUser?.id || m.userId === currentUser?.id);
  const canApprove = userMember?.role?.toLowerCase() === "owner" || userMember?.role?.toLowerCase() === "admin";

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const currentUserId = currentUser?.id;
    return currentTasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesMyWork = !showMyWork || !currentUserId ||
        task.assigneeIds?.includes(currentUserId) ||
        task.assigneeId === currentUserId ||
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
        const project = currentProjects.find((p) => p.id === task.projectId);
        const key = project?.name || "No Project";
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

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    await addTask({
      ...newTask,
      assigneeIds: newTask.assigneeIds.length > 0 ? newTask.assigneeIds : currentUser?.id ? [currentUser.id] : [],
    });
    setShowCreateModal(false);
    setNewTask({ title: "", description: "", priority: "Medium", status: "todo", assigneeIds: [], projectId: "", dueDate: "", tags: [], submittedLink: "", approverId: "" });
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditForm({ title: task.title, description: task.description || "", priority: task.priority, status: task.status, assigneeIds: task.assigneeIds || [], projectId: task.projectId || "", dueDate: task.dueDate || "", tags: task.tags || [], submittedLink: task.submittedLink || "", approverId: "" });
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    await updateTask(editingTask.id, { title: editForm.title, description: editForm.description, priority: editForm.priority, status: editForm.status, assigneeIds: editForm.assigneeIds, projectId: editForm.projectId, dueDate: editForm.dueDate, tags: editForm.tags, submittedLink: editForm.submittedLink });
    setEditingTask(null);
    if (selectedTask?.id === editingTask.id) setSelectedTask({ ...selectedTask, ...editForm });
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    const optimisticComment = { id: `temp-${Date.now()}`, content: newComment, authorId: currentUser?.id || "", authorName: currentUser?.email?.split("@")[0] || "You", createdAt: new Date().toISOString() };
    setSelectedTask({ ...selectedTask, comments: [...(selectedTask.comments || []), optimisticComment] });
    setNewComment("");
    await addTaskComment(selectedTask.id, newComment);
  };

  const handleEditComment = async (commentId: string) => {
    if (!selectedTask || !editingCommentContent.trim()) return;
    setSelectedTask({ ...selectedTask, comments: selectedTask.comments?.map((c) => (c.id === commentId ? { ...c, content: editingCommentContent } : c)) || [] });
    setEditingCommentId(null);
    setEditingCommentContent("");
    await updateTaskComment(selectedTask.id, commentId, editingCommentContent);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTask) return;
    setSelectedTask({ ...selectedTask, comments: selectedTask.comments?.filter((c) => c.id !== commentId) || [] });
    await deleteTaskComment(selectedTask.id, commentId);
  };

  const handleApproveSubmission = async (taskId: string, approved: boolean) => {
    await updateTask(taskId, { submissionStatus: approved ? "approved" : "rejected", status: approved ? "completed" : "in-progress" });
    setApprovalFeedback({ taskId, approved });
    setTimeout(() => setApprovalFeedback(null), 2000);
  };

  const handleInlineStatus = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setInlineStatusTaskId(inlineStatusTaskId === taskId ? null : taskId);
    setInlinePriorityTaskId(null);
  };

  const handleInlinePriority = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setInlinePriorityTaskId(inlinePriorityTaskId === taskId ? null : taskId);
    setInlineStatusTaskId(null);
  };

  const closeInline = () => { setInlineStatusTaskId(null); setInlinePriorityTaskId(null); };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Due-date helpers ───────────────────────────────────────────────────────
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

  // ── Task card (shared by list + board) ────────────────────────────────────
  function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
    const assignees = getAssignees(task, currentMembers);
    const { isOverdue, bg: dueBg, color: dueColor } = dueDateMeta(task);
    const StatusIcon = STATUS_CONFIG[task.status].icon;

    return (
      <div
        className={`rounded-xl border cursor-pointer transition-shadow hover:shadow-md relative ${compact ? "p-3" : "p-4"}`}
        style={{ background: "white", borderColor: isOverdue ? "#fca5a5" : "#e5e7eb", opacity: draggedTaskId === task.id ? 0.4 : 1 }}
        draggable={viewMode === "board"}
        onDragStart={(e) => { e.dataTransfer.setData("taskId", task.id); setDraggedTaskId(task.id); }}
        onDragEnd={() => { setDraggedTaskId(null); setDragOverStatus(null); }}
        onClick={() => { closeInline(); setSelectedTask(task); }}
      >
        {/* Inline dropdown overlay */}
        {(inlineStatusTaskId === task.id || inlinePriorityTaskId === task.id) && (
          <div className="fixed inset-0 z-10" onClick={closeInline} />
        )}

        <div className={`flex items-start gap-3 ${compact ? "" : "gap-4"}`}>
          {/* Status icon — clickable for inline status change */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 relative hover:ring-2 hover:ring-offset-1"
            style={{ background: `${STATUS_CONFIG[task.status].color}20`, ringColor: STATUS_CONFIG[task.status].color }}
            onClick={(e) => handleInlineStatus(e, task.id)}
            title="Change status"
          >
            <StatusIcon className="w-3.5 h-3.5" style={{ color: STATUS_CONFIG[task.status].color }} />
            {inlineStatusTaskId === task.id && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-xl z-20 min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl"
                    style={{ color: STATUS_CONFIG[s].color, fontWeight: task.status === s ? 600 : 400 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTask(task.id, { status: s });
                      if (selectedTask?.id === task.id) setSelectedTask({ ...selectedTask, status: s });
                      closeInline();
                    }}
                  >
                    <STATUS_CONFIG[s].icon className="w-3.5 h-3.5" />
                    {STATUS_CONFIG[s].label}
                    {task.status === s && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + priority + submission badge */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`font-medium ${compact ? "text-sm" : ""}`} style={{ color: "#111827" }}>{task.title}</span>
              {/* Priority badge — clickable for inline priority change */}
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 cursor-pointer hover:opacity-80 relative"
                style={{ background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}
                onClick={(e) => handleInlinePriority(e, task.id)}
                title="Change priority"
              >
                {task.priority}
                {inlinePriorityTaskId === task.id && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-xl z-20 min-w-[120px]" style={{ borderColor: "#e5e7eb" }}>
                    {(["Low", "Medium", "High"] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between first:rounded-t-xl last:rounded-b-xl"
                        style={{ color: PRIORITY_COLORS[p], fontWeight: task.priority === p ? 600 : 400 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTask(task.id, { priority: p });
                          closeInline();
                        }}
                      >
                        {p}
                        {task.priority === p && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </span>
              {task.submissionStatus && task.submissionStatus !== "none" && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                  style={{
                    background: task.submissionStatus === "approved" ? "#dcfce7" : task.submissionStatus === "rejected" ? "#fee2e2" : "#fef3c7",
                    color: task.submissionStatus === "approved" ? "#16a34a" : task.submissionStatus === "rejected" ? "#dc2626" : "#d97706",
                  }}
                >
                  {task.submissionStatus === "pending" ? "Pending" : task.submissionStatus === "approved" ? "Approved" : "Rejected"}
                </span>
              )}
            </div>

            {/* Description (list only) */}
            {!compact && task.description && (
              <p className="text-sm line-clamp-2 mb-3 break-words" style={{ color: "#6b7280" }}>{task.description}</p>
            )}

            {/* Assignee + deadline row */}
            <div className={`flex items-center justify-between gap-2 flex-wrap ${compact ? "mt-2" : "mt-2"}`}>
              <AvatarStack assignees={assignees} />
              <div className="flex items-center gap-2">
                {!compact && task.comments && task.comments.length > 0 && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#9ca3af" }}>
                    <MessageSquare className="w-3 h-3" />{task.comments.length}
                  </span>
                )}
                {task.submittedLink && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                    <Link2 className="w-3 h-3" /> {compact ? "" : "Submitted"}
                  </span>
                )}
                {task.dueDate && (
                  <span
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: dueBg, color: dueColor }}
                  >
                    <Calendar className="w-3 h-3" />
                    {isOverdue && !compact ? "Overdue · " : ""}{new Date(task.dueDate).toLocaleDateString()}
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
            <div
              key={status}
              className="flex-shrink-0 w-72 flex flex-col rounded-2xl"
              style={{ background: isOver ? `${STATUS_CONFIG[status].color}10` : "#f3f4f6", border: isOver ? `2px solid ${STATUS_CONFIG[status].color}` : "2px solid transparent", transition: "border 0.15s, background 0.15s" }}
              onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("taskId");
                if (taskId) updateTask(taskId, { status });
                setDraggedTaskId(null);
                setDragOverStatus(null);
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_CONFIG[status].color }} />
                  <span className="font-semibold text-sm" style={{ color: "#374151" }}>{STATUS_CONFIG[status].label}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${STATUS_CONFIG[status].color}20`, color: STATUS_CONFIG[status].color }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
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

  // ── List view (with optional groups) ──────────────────────────────────────
  function ListView() {
    return (
      <div className="space-y-6">
        {groupedTasks.map(({ key, label, tasks }) => (
          <div key={key}>
            {label && (
              <button
                className="flex items-center gap-2 mb-3 w-full text-left"
                onClick={() => toggleGroup(key)}
              >
                <ChevronDown
                  className="w-4 h-4 transition-transform"
                  style={{ color: "#6b7280", transform: collapsedGroups.has(key) ? "rotate(-90deg)" : "rotate(0deg)" }}
                />
                <span className="font-semibold text-sm" style={{ color: "#374151" }}>{label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#e5e7eb", color: "#6b7280" }}>{tasks.length}</span>
              </button>
            )}
            {!collapsedGroups.has(key) && (
              <div className="grid gap-3">
                {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
                {tasks.length === 0 && (
                  <p className="text-center py-8" style={{ color: "#9ca3af" }}>No tasks</p>
                )}
              </div>
            )}
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: "#6b7280" }}>No tasks found</p>
          </div>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Tasks</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            {showMyWork && " · My Work"}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
          style={{ background: "#f59e0b", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border"
            style={{ borderColor: "#e5e7eb", background: "white" }}
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <button
            onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowPriorityDropdown(false); setShowGroupByDropdown(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border"
            style={{ borderColor: statusFilter !== "all" ? "#f59e0b" : "#e5e7eb", background: statusFilter !== "all" ? "#fef3c7" : "white" }}
          >
            <Filter className="w-4 h-4" style={{ color: "#6b7280" }} />
            {statusFilter === "all" ? "Status" : STATUS_CONFIG[statusFilter].label}
            <ChevronDown className="w-4 h-4" style={{ color: "#6b7280" }} />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-white border rounded-xl shadow-lg z-10 min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => { setStatusFilter("all"); setShowStatusDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-xl">All Status</button>
              {STATUSES.map((status) => (
                <button key={status} onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 last:rounded-b-xl">
                  {STATUS_CONFIG[status].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority filter */}
        <div className="relative">
          <button
            onClick={() => { setShowPriorityDropdown(!showPriorityDropdown); setShowStatusDropdown(false); setShowGroupByDropdown(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border"
            style={{ borderColor: priorityFilter !== "all" ? "#f59e0b" : "#e5e7eb", background: priorityFilter !== "all" ? "#fef3c7" : "white" }}
          >
            <Tag className="w-4 h-4" style={{ color: "#6b7280" }} />
            {priorityFilter === "all" ? "Priority" : priorityFilter}
            <ChevronDown className="w-4 h-4" style={{ color: "#6b7280" }} />
          </button>
          {showPriorityDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-white border rounded-xl shadow-lg z-10 min-w-[130px]" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => { setPriorityFilter("all"); setShowPriorityDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-xl">All</button>
              {(["Low", "Medium", "High"] as TaskPriority[]).map((p) => (
                <button key={p} onClick={() => { setPriorityFilter(p); setShowPriorityDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 last:rounded-b-xl">{p}</button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px self-stretch" style={{ background: "#e5e7eb" }} />

        {/* My Work toggle */}
        <button
          onClick={() => setShowMyWork(!showMyWork)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm"
          style={{
            borderColor: showMyWork ? "#4338ca" : "#e5e7eb",
            background: showMyWork ? "#e0e7ff" : "white",
            color: showMyWork ? "#4338ca" : "#374151",
          }}
        >
          <User className="w-4 h-4" />
          My Work
        </button>

        {/* Group By (list view only) */}
        {viewMode === "list" && (
          <div className="relative">
            <button
              onClick={() => { setShowGroupByDropdown(!showGroupByDropdown); setShowStatusDropdown(false); setShowPriorityDropdown(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm"
              style={{
                borderColor: groupBy !== "none" ? "#4338ca" : "#e5e7eb",
                background: groupBy !== "none" ? "#e0e7ff" : "white",
                color: groupBy !== "none" ? "#4338ca" : "#374151",
              }}
            >
              <Layers className="w-4 h-4" />
              {groupBy === "none" ? "Group by" : `By ${groupBy}`}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showGroupByDropdown && (
              <div className="absolute top-full mt-1 right-0 bg-white border rounded-xl shadow-lg z-10 min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
                {([["none", "None"], ["project", "Project"], ["assignee", "Assignee"]] as [GroupBy, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setGroupBy(val); setShowGroupByDropdown(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center justify-between first:rounded-t-xl last:rounded-b-xl"
                    style={{ color: "#374151" }}
                  >
                    {label}
                    {groupBy === val && <Check className="w-3 h-3" style={{ color: "#4338ca" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View mode toggle */}
        <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <button
            onClick={() => setViewMode("list")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm"
            style={{ background: viewMode === "list" ? "#f59e0b" : "white", color: viewMode === "list" ? "white" : "#6b7280" }}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setViewMode("board")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border-l"
            style={{ background: viewMode === "board" ? "#f59e0b" : "white", color: viewMode === "board" ? "white" : "#6b7280", borderColor: "#e5e7eb" }}
          >
            <LayoutGrid className="w-4 h-4" />
            Board
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "board" ? <BoardView /> : <ListView />}

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
                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="Task title" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Description</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border resize-none" style={{ borderColor: "#e5e7eb" }} rows={3} placeholder="Task description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Priority</label>
                  <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Project</label>
                  <select value={newTask.projectId} onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                    <option value="">Select project</option>
                    {currentProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Assignees</label>
                <div className="space-y-2 border rounded-xl p-3" style={{ borderColor: "#e5e7eb" }}>
                  {currentMembers.map((member) => {
                    const memberId = member.userId || member.id;
                    return (
                      <label key={member.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={newTask.assigneeIds.includes(memberId)} onChange={(e) => setNewTask({ ...newTask, assigneeIds: e.target.checked ? [...newTask.assigneeIds, memberId] : newTask.assigneeIds.filter((id) => id !== memberId) })} className="rounded" />
                        <span style={{ color: "#374151" }}>{member.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Approver</label>
                <select value={newTask.approverId} onChange={(e) => setNewTask({ ...newTask, approverId: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                  <option value="">Select approver</option>
                  {currentMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <DatePicker label="Due Date" value={newTask.dueDate} onChange={(date) => setNewTask({ ...newTask, dueDate: date })} />
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Submit Link (optional)</label>
                <input type="url" value={newTask.submittedLink} onChange={(e) => setNewTask({ ...newTask, submittedLink: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newTask.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm" style={{ background: "#f3f4f6" }}>
                      {tag}<button onClick={() => setNewTask({ ...newTask, tags: newTask.tags.filter((t) => t !== tag) })} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={(e) => { if (e.key === "Enter" && newTag.trim()) { setNewTask({ ...newTask, tags: [...newTask.tags, newTag.trim()] }); setNewTag(""); } }} className="flex-1 px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="Add tag" />
                  <button onClick={() => { if (newTag.trim()) { setNewTask({ ...newTask, tags: [...newTask.tags, newTag.trim()] }); setNewTag(""); } }} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Add</button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Cancel</button>
              <button onClick={handleCreateTask} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b" }}>Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Task Modal ── */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Edit Task</h2>
                <button onClick={() => setEditingTask(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Title</label>
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border resize-none" style={{ borderColor: "#e5e7eb" }} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TaskStatus })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Assignees</label>
                <div className="space-y-2 border rounded-xl p-3" style={{ borderColor: "#e5e7eb" }}>
                  {currentMembers.map((member) => {
                    const memberId = member.userId || member.id;
                    return (
                      <label key={member.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editForm.assigneeIds.includes(memberId) || editForm.assigneeIds.includes(member.id)} onChange={(e) => setEditForm({ ...editForm, assigneeIds: e.target.checked ? [...editForm.assigneeIds.filter(id => id !== member.id), memberId] : editForm.assigneeIds.filter((id) => id !== memberId && id !== member.id) })} className="rounded" />
                        <span style={{ color: "#374151" }}>{member.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Project</label>
                <select value={editForm.projectId} onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                  <option value="">Select project</option>
                  {currentProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <DatePicker label="Due Date" value={editForm.dueDate} onChange={(date) => setEditForm({ ...editForm, dueDate: date })} />
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Submit Link</label>
                <input type="url" value={editForm.submittedLink} onChange={(e) => setEditForm({ ...editForm, submittedLink: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editForm.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm" style={{ background: "#f3f4f6" }}>
                      {tag}<button onClick={() => setEditForm({ ...editForm, tags: editForm.tags.filter((t) => t !== tag) })} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={editTag} onChange={(e) => setEditTag(e.target.value)} onKeyPress={(e) => { if (e.key === "Enter" && editTag.trim()) { setEditForm({ ...editForm, tags: [...editForm.tags, editTag.trim()] }); setEditTag(""); } }} className="flex-1 px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="Add tag" />
                  <button onClick={() => { if (editTag.trim()) { setEditForm({ ...editForm, tags: [...editForm.tags, editTag.trim()] }); setEditTag(""); } }} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Add</button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setEditingTask(null)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Cancel</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task Detail Modal ── */}
      {selectedTask && !editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>{selectedTask.title}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditModal(selectedTask)} className="p-2 rounded-lg hover:bg-gray-100"><Pencil className="w-4 h-4" style={{ color: "#6b7280" }} /></button>
                  <button onClick={() => { deleteTask(selectedTask.id); setSelectedTask(null); }} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
                  <button onClick={() => setSelectedTask(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {selectedTask.description && <p className="mb-4 break-words whitespace-pre-wrap" style={{ color: "#6b7280" }}>{selectedTask.description}</p>}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Status</p>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => {
                      updateTask(selectedTask.id, { status: e.target.value as TaskStatus });
                      setSelectedTask({ ...selectedTask, status: e.target.value as TaskStatus });
                    }}
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Priority</p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm" style={{ background: `${PRIORITY_COLORS[selectedTask.priority]}20`, color: PRIORITY_COLORS[selectedTask.priority] }}>
                    {selectedTask.priority}
                  </span>
                </div>
              </div>

              {/* Submission */}
              <div className="border-t pt-4 mb-4" style={{ borderColor: "#e5e7eb" }}>
                <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: "#111827" }}><Link2 className="w-4 h-4" />Submission</h3>
                {selectedTask.submittedLink ? (
                  <div className="p-3 rounded-lg" style={{ background: "#f9fafb" }}>
                    <div className="flex items-center justify-between mb-2">
                      <a href={selectedTask.submittedLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#3b82f6" }}>
                        <ExternalLink className="w-4 h-4" />{selectedTask.submittedLink}
                      </a>
                      {selectedTask.submissionStatus && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: selectedTask.submissionStatus === "approved" ? "#dcfce7" : selectedTask.submissionStatus === "rejected" ? "#fee2e2" : "#fef3c7", color: selectedTask.submissionStatus === "approved" ? "#16a34a" : selectedTask.submissionStatus === "rejected" ? "#dc2626" : "#d97706" }}>
                          {selectedTask.submissionStatus}
                        </span>
                      )}
                    </div>
                    {selectedTask.submissionStatus === "pending" && canApprove && (
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => handleApproveSubmission(selectedTask.id, true)} className="flex items-center gap-2 flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white" style={{ background: "#22c55e" }}><Check className="w-5 h-5" />Approve</button>
                        <button onClick={() => handleApproveSubmission(selectedTask.id, false)} className="flex items-center gap-2 flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white" style={{ background: "#ef4444" }}><XCircle className="w-5 h-5" />Reject</button>
                      </div>
                    )}
                    {selectedTask.submissionStatus === "pending" && !canApprove && (
                      <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "#f3f4f6", color: "#6b7280" }}>Only team admins and owners can approve submissions.</div>
                    )}
                    {approvalFeedback?.taskId === selectedTask.id && (
                      <div className="flex items-center gap-2 mt-3 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: approvalFeedback.approved ? "#dcfce7" : "#fee2e2", color: approvalFeedback.approved ? "#16a34a" : "#dc2626" }}>
                        <Check className="w-4 h-4" />{approvalFeedback.approved ? "Approved successfully!" : "Rejected successfully!"}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste your submission link..."
                      className="flex-1 px-4 py-2 rounded-xl border text-sm"
                      style={{ borderColor: "#e5e7eb" }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          const input = e.target as HTMLInputElement;
                          if (input.value.trim()) {
                            updateTask(selectedTask.id, { submittedLink: input.value.trim(), submissionStatus: "pending" });
                            setSelectedTask({ ...selectedTask, submittedLink: input.value.trim(), submissionStatus: "pending" });
                            input.value = "";
                          }
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                        if (input.value.trim()) {
                          updateTask(selectedTask.id, { submittedLink: input.value.trim(), submissionStatus: "pending" });
                          setSelectedTask({ ...selectedTask, submittedLink: input.value.trim(), submissionStatus: "pending" });
                          input.value = "";
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-white text-sm"
                      style={{ background: "#f59e0b" }}
                    >Submit</button>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="border-t pt-4" style={{ borderColor: "#e5e7eb" }}>
                <h3 className="font-medium mb-4" style={{ color: "#111827" }}>Comments</h3>
                <div className="space-y-3 mb-4">
                  {selectedTask.comments?.map((comment) => (
                    <div key={comment.id} className="p-3 rounded-lg" style={{ background: resolvedComments.has(comment.id) ? "#f0fdf4" : "#f9fafb" }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm" style={{ color: "#111827" }}>{comment.authorName || "Unknown"}</span>
                          <span className="text-xs" style={{ color: "#9ca3af" }}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                          {resolvedComments.has(comment.id) && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#dcfce7", color: "#16a34a" }}>✓ Resolved</span>}
                        </div>
                        {comment.authorId === currentUser?.id && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => setResolvedComments((prev) => { const next = new Set(prev); next.has(comment.id) ? next.delete(comment.id) : next.add(comment.id); return next; })} className="p-1 rounded hover:bg-green-100">
                              <Check className="w-3 h-3" style={{ color: resolvedComments.has(comment.id) ? "#16a34a" : "#9ca3af" }} />
                            </button>
                            <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentContent(comment.content); }} className="p-1 rounded hover:bg-gray-200"><Pencil className="w-3 h-3" style={{ color: "#6b7280" }} /></button>
                            <button onClick={() => handleDeleteComment(comment.id)} className="p-1 rounded hover:bg-red-100"><Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} /></button>
                          </div>
                        )}
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="flex gap-2 mt-2">
                          <input type="text" value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: "#e5e7eb" }} />
                          <button onClick={() => handleEditComment(comment.id)} className="px-3 py-1.5 rounded-lg text-white text-sm" style={{ background: "#f59e0b" }}>Save</button>
                          <button onClick={() => { setEditingCommentId(null); setEditingCommentContent(""); }} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: "#f3f4f6" }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm mb-2" style={{ color: "#6b7280" }}>{comment.content}</p>
                          <button onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)} className="text-xs font-medium" style={{ color: "#3b82f6" }}>
                            {replyingToCommentId === comment.id ? "Cancel Reply" : "Reply"}
                          </button>
                          {replyingToCommentId === comment.id && (
                            <div className="flex gap-2 mt-2">
                              <input type="text" value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Write a reply..." className="flex-1 px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: "#e5e7eb" }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter" && replyContent.trim()) {
                                    const replyText = `@${comment.authorName} ${replyContent}`;
                                    setSelectedTask({ ...selectedTask, comments: [...(selectedTask.comments || []), { id: `temp-${Date.now()}`, content: replyText, authorId: currentUser?.id || "", authorName: currentUser?.email?.split("@")[0] || "You", createdAt: new Date().toISOString() }] });
                                    setReplyContent(""); setReplyingToCommentId(null);
                                    addTaskComment(selectedTask.id, replyText);
                                  }
                                }}
                              />
                              <button onClick={() => { if (replyContent.trim()) { const replyText = `@${comment.authorName} ${replyContent}`; setSelectedTask({ ...selectedTask, comments: [...(selectedTask.comments || []), { id: `temp-${Date.now()}`, content: replyText, authorId: currentUser?.id || "", authorName: currentUser?.email?.split("@")[0] || "You", createdAt: new Date().toISOString() }] }); setReplyContent(""); setReplyingToCommentId(null); addTaskComment(selectedTask.id, replyText); } }} className="px-3 py-1.5 rounded-lg text-white text-sm" style={{ background: "#3b82f6" }}><Send className="w-3 h-3" /></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleAddComment()} className="flex-1 px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="Add a comment..." />
                  <button onClick={handleAddComment} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b" }}><Send className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
