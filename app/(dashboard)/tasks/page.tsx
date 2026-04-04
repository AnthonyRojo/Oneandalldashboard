"use client";

import { useState } from "react";
import { useApp, Task, TaskPriority, TaskStatus } from "@/context/AppContext";
import {
  Plus, Search, Filter, CheckCircle, Clock, AlertCircle, MessageSquare,
  X, Send, ChevronDown, Tag, Pencil, Trash2, ExternalLink,
  ThumbsUp, ThumbsDown, Check, Save, Users, Calendar
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  todo: { label: "To Do", icon: Clock, color: "#6b7280" },
  "in-progress": { label: "In Progress", icon: AlertCircle, color: "#3b82f6" },
  review: { label: "Review", icon: Clock, color: "#f59e0b" },
  done: { label: "Done", icon: CheckCircle, color: "#22c55e" },
};

export default function TasksPage() {
  const {
    currentUser,
    currentTasks,
    currentMembers,
    createTask,
    updateTask,
    deleteTask,
    addTaskComment,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskStatus,
    assigneeId: "",
    dueDate: "",
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const filteredTasks = currentTasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    await createTask({
      ...newTask,
      assigneeId: newTask.assigneeId || currentUser?.id || "",
    });
    setShowCreateModal(false);
    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      assigneeId: "",
      dueDate: "",
      tags: [],
    });
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    await updateTask(editingTask.id, editingTask);
    setEditingTask(null);
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    await addTaskComment(selectedTask.id, newComment);
    setNewComment("");
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
            {priorityFilter === "all" ? "All Priority" : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
            <ChevronDown className="w-4 h-4" style={{ color: "#6b7280" }} />
          </button>
          {showPriorityDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-white border rounded-xl shadow-lg z-10 min-w-[150px]" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => { setPriorityFilter("all"); setShowPriorityDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">All Priority</button>
              {(["low", "medium", "high"] as TaskPriority[]).map((priority) => (
                <button key={priority} onClick={() => { setPriorityFilter(priority); setShowPriorityDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="grid gap-4">
        {filteredTasks.map((task) => {
          const assignee = currentMembers.find((m) => m.id === task.assigneeId);
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
                  </div>
                  {task.description && (
                    <p className="text-sm truncate mb-2" style={{ color: "#6b7280" }}>{task.description}</p>
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Create Task</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" style={{ color: "#6b7280" }} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
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
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Assignee</label>
                  <select
                    value={newTask.assigneeId}
                    onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    <option value="">Select assignee</option>
                    {currentMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Due Date</label>
                <DatePicker
                  value={newTask.dueDate ? new Date(newTask.dueDate) : undefined}
                  onChange={(date) => setNewTask({ ...newTask, dueDate: date ? date.toISOString() : "" })}
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
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: "#e5e7eb" }}>
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

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>{selectedTask.title}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingTask(selectedTask)} className="p-2 rounded-lg hover:bg-gray-100">
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
            <div className="p-6">
              {selectedTask.description && (
                <p className="mb-4" style={{ color: "#6b7280" }}>{selectedTask.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Status</p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm" style={{ background: `${STATUS_CONFIG[selectedTask.status].color}20`, color: STATUS_CONFIG[selectedTask.status].color }}>
                    {STATUS_CONFIG[selectedTask.status].label}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Priority</p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm" style={{ background: `${PRIORITY_COLORS[selectedTask.priority]}20`, color: PRIORITY_COLORS[selectedTask.priority] }}>
                    {selectedTask.priority}
                  </span>
                </div>
              </div>
              
              {/* Comments */}
              <div className="border-t pt-4" style={{ borderColor: "#e5e7eb" }}>
                <h3 className="font-medium mb-4" style={{ color: "#111827" }}>Comments</h3>
                <div className="space-y-3 mb-4">
                  {selectedTask.comments?.map((comment) => (
                    <div key={comment.id} className="p-3 rounded-lg" style={{ background: "#f9fafb" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm" style={{ color: "#111827" }}>
                          {currentMembers.find((m) => m.id === comment.authorId)?.name || "Unknown"}
                        </span>
                        <span className="text-xs" style={{ color: "#9ca3af" }}>
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: "#6b7280" }}>{comment.content}</p>
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
                  <button onClick={handleAddComment} className="p-2 rounded-xl" style={{ background: "#f59e0b" }}>
                    <Send className="w-4 h-4 text-white" />
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
