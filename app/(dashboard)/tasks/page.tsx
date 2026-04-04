"use client";

import { useState } from "react";
import { useApp, Task, TaskPriority, TaskStatus, TaskComment } from "@/context/AppContext";
import {
  Plus, Search, Filter, CheckCircle, Clock, AlertCircle, MessageSquare,
  X, ChevronDown, Tag, Pencil, Trash2, Users, Calendar, Link2, UserCheck,
  Send, ExternalLink, Check, XCircle
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

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

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [resolvedComments, setResolvedComments] = useState<Set<string>>(new Set());
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium" as TaskPriority,
    status: "todo" as TaskStatus,
    assigneeIds: [] as string[],
    projectId: "",
    dueDate: "",
    tags: [] as string[],
    submittedLink: "",
    approverId: "",
  });
  const [newTag, setNewTag] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // For task editing modal
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "Medium" as TaskPriority,
    status: "todo" as TaskStatus,
    assigneeIds: [] as string[],
    projectId: "",
    dueDate: "",
    tags: [] as string[],
    submittedLink: "",
    approverId: "",
  });
  const currentUserRole = currentMembers.find((m) => m.id === currentUser?.id)?.role;
  const canApprove = currentUserRole === "Owner" || currentUserRole === "Admin";

  const filteredTasks = currentTasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    await addTask({
      ...newTask,
      assigneeIds: newTask.assigneeIds.length > 0 ? newTask.assigneeIds : (currentUser?.id ? [currentUser.id] : []),
    });
    setShowCreateModal(false);
    setNewTask({
      title: "",
      description: "",
      priority: "Medium",
      status: "todo",
      assigneeIds: [],
      projectId: "",
      dueDate: "",
      tags: [],
      submittedLink: "",
      approverId: "",
    });
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    // Optimistic update - add comment immediately to UI
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      content: newComment,
      authorId: currentUser?.id || "",
      authorName: currentUser?.email?.split("@")[0] || "You",
      createdAt: new Date().toISOString(),
    };
    setSelectedTask({
      ...selectedTask,
      comments: [...(selectedTask.comments || []), optimisticComment]
    });
    setNewComment("");
    // Update backend
    await addTaskComment(selectedTask.id, newComment);
  };

  const handleEditComment = async (commentId: string) => {
    if (!selectedTask || !editingCommentContent.trim()) return;
    // Optimistic update
    setSelectedTask({
      ...selectedTask,
      comments: selectedTask.comments?.map(c => 
        c.id === commentId ? { ...c, content: editingCommentContent } : c
      ) || []
    });
    setEditingCommentId(null);
    setEditingCommentContent("");
    // Update backend
    await updateTaskComment(selectedTask.id, commentId, editingCommentContent);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTask) return;
    // Optimistic update
    setSelectedTask({
      ...selectedTask,
      comments: selectedTask.comments?.filter(c => c.id !== commentId) || []
    });
    // Update backend
    await deleteTaskComment(selectedTask.id, commentId);
  };

  const addTag = () => {
    if (newTag.trim() && !newTask.tags.includes(newTag.trim())) {
      setNewTask({ ...newTask, tags: [...newTask.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setNewTask({ ...newTask, tags: newTask.tags.filter((t) => t !== tag) });
  };

  const addEditTag = () => {
    if (editTag.trim() && !editForm.tags.includes(editTag.trim())) {
      setEditForm({ ...editForm, tags: [...editForm.tags, editTag.trim()] });
      setEditTag("");
    }
  };

  const removeEditTag = (tag: string) => {
    setEditForm({ ...editForm, tags: editForm.tags.filter((t) => t !== tag) });
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      assigneeIds: task.assigneeIds || [],
      projectId: task.projectId || "",
      dueDate: task.dueDate || "",
      tags: task.tags || [],
      submittedLink: task.submittedLink || "",
      approverId: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    await updateTask(editingTask.id, {
      title: editForm.title,
      description: editForm.description,
      priority: editForm.priority,
      status: editForm.status,
      assigneeIds: editForm.assigneeIds,
      projectId: editForm.projectId,
      dueDate: editForm.dueDate,
      tags: editForm.tags,
      submittedLink: editForm.submittedLink,
    });
    setEditingTask(null);
    if (selectedTask?.id === editingTask.id) {
      setSelectedTask({ ...selectedTask, ...editForm });
    }
  };

  const handleSubmitLink = async (taskId: string, link: string) => {
    await updateTask(taskId, { 
      submittedLink: link, 
      submissionStatus: "pending" 
    });
  };

  const handleApproveSubmission = async (taskId: string, approved: boolean) => {
    await updateTask(taskId, { 
      submissionStatus: approved ? "approved" : "rejected",
      status: approved ? "completed" : "in-progress"
    });
    setApprovalFeedback({ taskId, approved });
    setTimeout(() => setApprovalFeedback(null), 2000);
  };

  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Tasks</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors"
          style={{ background: "#f59e0b", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
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
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border"
            style={{ borderColor: "#e5e7eb", background: "white" }}
          >
            <Filter className="w-4 h-4" style={{ color: "#6b7280" }} />
            {statusFilter === "all" ? "All Status" : STATUS_CONFIG[statusFilter].label}
            <ChevronDown className="w-4 h-4" style={{ color: "#6b7280" }} />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-white border rounded-xl shadow-lg z-10 min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => { setStatusFilter("all"); setShowStatusDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">All Status</button>
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
                <button key={status} onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">
                  {STATUS_CONFIG[status].label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border"
            style={{ borderColor: "#e5e7eb", background: "white" }}
          >
            <Tag className="w-4 h-4" style={{ color: "#6b7280" }} />
            {priorityFilter === "all" ? "All Priority" : priorityFilter}
            <ChevronDown className="w-4 h-4" style={{ color: "#6b7280" }} />
          </button>
          {showPriorityDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-white border rounded-xl shadow-lg z-10 min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => { setPriorityFilter("all"); setShowPriorityDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">All Priority</button>
              {(["Low", "Medium", "High"] as TaskPriority[]).map((priority) => (
                <button key={priority} onClick={() => { setPriorityFilter(priority); setShowPriorityDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">
                  {priority}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="grid gap-4">
        {filteredTasks.map((task) => {
          const assignee = currentMembers.find((m) => task.assigneeIds?.includes(m.id) || m.id === task.assigneeId);
          const StatusIcon = STATUS_CONFIG[task.status].icon;
          return (
            <div
              key={task.id}
              className="p-4 rounded-xl border cursor-pointer transition-shadow hover:shadow-md"
              style={{ background: "white", borderColor: "#e5e7eb" }}
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${STATUS_CONFIG[task.status].color}20` }}
                >
                  <StatusIcon className="w-4 h-4" style={{ color: STATUS_CONFIG[task.status].color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate" style={{ color: "#111827" }}>{task.title}</h3>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}
                    >
                      {task.priority}
                    </span>
                    {task.submissionStatus && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          background: task.submissionStatus === "approved" ? "#dcfce7" : task.submissionStatus === "rejected" ? "#fee2e2" : "#fef3c7",
                          color: task.submissionStatus === "approved" ? "#16a34a" : task.submissionStatus === "rejected" ? "#dc2626" : "#d97706"
                        }}
                      >
                        {task.submissionStatus === "pending" ? "Pending Approval" : task.submissionStatus === "approved" ? "Approved" : "Rejected"}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm line-clamp-2 mb-2 break-words" style={{ color: "#6b7280" }}>{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm" style={{ color: "#9ca3af" }}>
                    {assignee && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {assignee.name}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {task.submittedLink && (
                      <span className="flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        Submitted
                      </span>
                    )}
                    {task.comments && task.comments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {task.comments.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: "#6b7280" }}>No tasks found</p>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Create Task</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" style={{ color: "#6b7280" }} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border resize-none"
                  style={{ borderColor: "#e5e7eb" }}
                  rows={3}
                  placeholder="Task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                    className="w-full px-4 py-2 rounded-xl border"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Project</label>
                  <select
                    value={newTask.projectId}
                    onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    <option value="">Select project</option>
                    {currentProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Assignees (select multiple)</label>
                <div className="space-y-2 border rounded-xl p-3" style={{ borderColor: "#e5e7eb" }}>
                  {currentMembers.map((member) => (
                    <label key={member.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTask.assigneeIds.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTask({ ...newTask, assigneeIds: [...newTask.assigneeIds, member.id] });
                          } else {
                            setNewTask({ ...newTask, assigneeIds: newTask.assigneeIds.filter((id) => id !== member.id) });
                          }
                        }}
                        className="rounded"
                      />
                      <span style={{ color: "#374151" }}>{member.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Approver (for submissions)</label>
                <select
                  value={newTask.approverId}
                  onChange={(e) => setNewTask({ ...newTask, approverId: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  <option value="">Select approver</option>
                  {currentMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <DatePicker
                  label="Due Date"
                  value={newTask.dueDate}
                  onChange={(date) => setNewTask({ ...newTask, dueDate: date })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Submit Link (optional)</label>
                <input
                  type="url"
                  value={newTask.submittedLink}
                  onChange={(e) => setNewTask({ ...newTask, submittedLink: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newTask.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm" style={{ background: "#f3f4f6" }}>
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                    className="flex-1 px-4 py-2 rounded-xl border"
                    style={{ borderColor: "#e5e7eb" }}
                    placeholder="Add tag"
                  />
                  <button onClick={addTag} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>
                    Add
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>
                Cancel
              </button>
              <button onClick={handleCreateTask} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b" }}>
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Edit Task</h2>
                <button onClick={() => setEditingTask(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" style={{ color: "#6b7280" }} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border"
                  style={{ borderColor: "#e5e7eb" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border resize-none"
                  style={{ borderColor: "#e5e7eb" }}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TaskStatus })}
                    className="w-full px-4 py-2 rounded-xl border"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
                      <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                    className="w-full px-4 py-2 rounded-xl border"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Assignees (select multiple)</label>
                <div className="space-y-2 border rounded-xl p-3" style={{ borderColor: "#e5e7eb" }}>
                  {currentMembers.map((member) => (
                    <label key={member.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.assigneeIds.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditForm({ ...editForm, assigneeIds: [...editForm.assigneeIds, member.id] });
                          } else {
                            setEditForm({ ...editForm, assigneeIds: editForm.assigneeIds.filter((id) => id !== member.id) });
                          }
                        }}
                        className="rounded"
                      />
                      <span style={{ color: "#374151" }}>{member.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Project</label>
                <select
                  value={editForm.projectId}
                  onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  <option value="">Select project</option>
                  {currentProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <DatePicker
                  label="Due Date"
                  value={editForm.dueDate}
                  onChange={(date) => setEditForm({ ...editForm, dueDate: date })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Submit Link</label>
                <input
                  type="url"
                  value={editForm.submittedLink}
                  onChange={(e) => setEditForm({ ...editForm, submittedLink: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editForm.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm" style={{ background: "#f3f4f6" }}>
                      {tag}
                      <button onClick={() => removeEditTag(tag)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addEditTag()}
                    className="flex-1 px-4 py-2 rounded-xl border"
                    style={{ borderColor: "#e5e7eb" }}
                    placeholder="Add tag"
                  />
                  <button onClick={addEditTag} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>
                    Add
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setEditingTask(null)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b" }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && !editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>{selectedTask.title}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditModal(selectedTask)} className="p-2 rounded-lg hover:bg-gray-100">
                    <Pencil className="w-4 h-4" style={{ color: "#6b7280" }} />
                  </button>
                  <button onClick={() => { deleteTask(selectedTask.id); setSelectedTask(null); }} className="p-2 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                  </button>
                  <button onClick={() => setSelectedTask(null)} className="p-2 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" style={{ color: "#6b7280" }} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {selectedTask.description && (
                <p className="mb-4 break-words whitespace-pre-wrap" style={{ color: "#6b7280" }}>{selectedTask.description}</p>
              )}
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
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
                      <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Priority</p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm" style={{ background: `${PRIORITY_COLORS[selectedTask.priority]}20`, color: PRIORITY_COLORS[selectedTask.priority] }}>
                    {selectedTask.priority}
                  </span>
                </div>
              </div>

              {/* Submit Link Section */}
              <div className="border-t pt-4 mb-4" style={{ borderColor: "#e5e7eb" }}>
                <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: "#111827" }}>
                  <Link2 className="w-4 h-4" />
                  Submission
                </h3>
                {selectedTask.submittedLink ? (
                  <div className="p-3 rounded-lg" style={{ background: "#f9fafb" }}>
                    <div className="flex items-center justify-between mb-2">
                      <a 
                        href={selectedTask.submittedLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:underline"
                        style={{ color: "#3b82f6" }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        {selectedTask.submittedLink}
                      </a>
                      {selectedTask.submissionStatus && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ 
                            background: selectedTask.submissionStatus === "approved" ? "#dcfce7" : selectedTask.submissionStatus === "rejected" ? "#fee2e2" : "#fef3c7",
                            color: selectedTask.submissionStatus === "approved" ? "#16a34a" : selectedTask.submissionStatus === "rejected" ? "#dc2626" : "#d97706"
                          }}
                        >
                          {selectedTask.submissionStatus}
                        </span>
                      )}
                    </div>
                    {selectedTask.submissionStatus === "pending" && canApprove && (
                      <div className="flex gap-3 mt-4">
                        <button 
                          onClick={() => handleApproveSubmission(selectedTask.id, true)}
                          className="flex items-center gap-2 flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white transition-all hover:shadow-md"
                          style={{ background: "#22c55e" }}
                        >
                          <Check className="w-5 h-5" /> Approve
                        </button>
                        <button 
                          onClick={() => handleApproveSubmission(selectedTask.id, false)}
                          className="flex items-center gap-2 flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white transition-all hover:shadow-md"
                          style={{ background: "#ef4444" }}
                        >
                          <XCircle className="w-5 h-5" /> Reject
                        </button>
                      </div>
                    )}
                    {selectedTask.submissionStatus === "pending" && !canApprove && (
                      <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                        Only team admins and owners can approve submissions.
                      </div>
                    )}
                    {approvalFeedback?.taskId === selectedTask.id && (
                      <div className="flex items-center gap-2 mt-3 px-4 py-2 rounded-lg text-sm font-medium" style={{ 
                        background: approvalFeedback.approved ? "#dcfce7" : "#fee2e2",
                        color: approvalFeedback.approved ? "#16a34a" : "#dc2626"
                      }}>
                        <Check className="w-4 h-4" />
                        {approvalFeedback.approved ? "Approved successfully!" : "Rejected successfully!"}
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
                            handleSubmitLink(selectedTask.id, input.value.trim());
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
                          handleSubmitLink(selectedTask.id, input.value.trim());
                          setSelectedTask({ ...selectedTask, submittedLink: input.value.trim(), submissionStatus: "pending" });
                          input.value = "";
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-white text-sm"
                      style={{ background: "#f59e0b" }}
                    >
                      Submit
                    </button>
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
                          <span className="font-medium text-sm" style={{ color: "#111827" }}>
                            {comment.authorName || "Unknown"}
                          </span>
                          <span className="text-xs" style={{ color: "#9ca3af" }}>
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                          {resolvedComments.has(comment.id) && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#dcfce7", color: "#16a34a" }}>
                              ✓ Resolved
                            </span>
                          )}
                        </div>
                        {comment.authorId === currentUser?.id && (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => setResolvedComments(prev => {
                                const next = new Set(prev);
                                next.has(comment.id) ? next.delete(comment.id) : next.add(comment.id);
                                return next;
                              })}
                              className="p-1 rounded hover:bg-green-100"
                              title={resolvedComments.has(comment.id) ? "Mark as unresolved" : "Mark as resolved"}
                            >
                              <Check className="w-3 h-3" style={{ color: resolvedComments.has(comment.id) ? "#16a34a" : "#9ca3af" }} />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentContent(comment.content);
                              }}
                              className="p-1 rounded hover:bg-gray-200"
                            >
                              <Pencil className="w-3 h-3" style={{ color: "#6b7280" }} />
                            </button>
                            <button 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 rounded hover:bg-red-100"
                            >
                              <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
                            </button>
                          </div>
                        )}
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border text-sm"
                            style={{ borderColor: "#e5e7eb" }}
                          />
                          <button 
                            onClick={() => handleEditComment(comment.id)}
                            className="px-3 py-1.5 rounded-lg text-white text-sm"
                            style={{ background: "#f59e0b" }}
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => { setEditingCommentId(null); setEditingCommentContent(""); }}
                            className="px-3 py-1.5 rounded-lg text-sm"
                            style={{ background: "#f3f4f6" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm mb-2" style={{ color: "#6b7280" }}>{comment.content}</p>
                          <button 
                            onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}
                            className="text-xs font-medium transition-colors"
                            style={{ color: "#3b82f6" }}
                          >
                            {replyingToCommentId === comment.id ? "Cancel Reply" : "Reply"}
                          </button>
                          {replyingToCommentId === comment.id && (
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Write a reply..."
                                className="flex-1 px-3 py-1.5 rounded-lg border text-sm"
                                style={{ borderColor: "#e5e7eb" }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter" && replyContent.trim()) {
                                    addTaskComment(selectedTask.id, `@${comment.authorName} ${replyContent}`);
                                    setReplyContent("");
                                    setReplyingToCommentId(null);
                                  }
                                }}
                              />
                              <button 
                                onClick={() => {
                                  if (replyContent.trim()) {
                                    addTaskComment(selectedTask.id, `@${comment.authorName} ${replyContent}`);
                                    setReplyContent("");
                                    setReplyingToCommentId(null);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg text-white text-sm"
                                style={{ background: "#3b82f6" }}
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                    className="flex-1 px-4 py-2 rounded-xl border"
                    style={{ borderColor: "#e5e7eb" }}
                    placeholder="Add a comment..."
                  />
                  <button onClick={handleAddComment} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b" }}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
