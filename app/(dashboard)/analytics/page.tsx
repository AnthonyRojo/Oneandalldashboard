"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { TrendingUp, Users, CheckCircle, Calendar, Activity, ChevronRight } from "lucide-react";

export default function AnalyticsPage() {
  const { currentTasks, currentMembers, currentEvents, currentActivities, currentTeam } = useApp();
  const [activityPage, setActivityPage] = useState(0);

  const tasksByStatus = {
    todo: currentTasks.filter((t) => (t.status as string)?.toLowerCase() === "todo").length,
    "in-progress": currentTasks.filter((t) => (t.status as string)?.toLowerCase() === "in-progress").length,
    review: currentTasks.filter((t) => (t.status as string)?.toLowerCase() === "review").length,
    completed: currentTasks.filter((t) => (t.status as string)?.toLowerCase() === "completed").length,
  };

  const tasksByPriority = {
    Low: currentTasks.filter((t) => t.priority === "Low").length,
    Medium: currentTasks.filter((t) => t.priority === "Medium").length,
    High: currentTasks.filter((t) => t.priority === "High").length,
  };

  const completionRate = currentTasks.length > 0 ? Math.round((tasksByStatus.completed / currentTasks.length) * 100) : 0;
  const sortedActivities = [...currentActivities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const paginatedActivities = sortedActivities.slice(activityPage * 7, (activityPage + 1) * 7);
  const totalPages = Math.ceil(sortedActivities.length / 7);

  // Calculate member stats with useMemo to ensure it updates when tasks/members change
  const memberStats = useMemo(() => {
    const stats = currentMembers.map((member) => {
      const memberTasks = currentTasks.filter((t) => {
        // Tasks store assignees as profile UUIDs (member.userId), not team_member record UUIDs (member.id)
        const isAssignedViaId = t.assigneeId === member.id || (member.userId && t.assigneeId === member.userId);
        const isAssignedViaIds = Array.isArray(t.assigneeIds) && (
          t.assigneeIds.includes(member.id) ||
          Boolean(member.userId && t.assigneeIds.includes(member.userId))
        );
        return isAssignedViaId || isAssignedViaIds;
      });
      const completedTasks = memberTasks.filter((t) => (t.status as string)?.toLowerCase() === "completed").length;
      const memberActivities = currentActivities.filter((a) => a.userId === member.id || (member.userId && a.userId === member.userId));

      return {
        ...member,
        totalTasks: memberTasks.length,
        completedTasks,
        activities: memberActivities.length,
        recentAction: memberActivities[0]?.action || "No recent activity"
      };
    }).sort((a, b) => b.totalTasks - a.totalTasks);

    return stats;
  }, [currentMembers, currentTasks, currentActivities]);

  const stats = [
    { label: "Total Tasks", value: currentTasks.length, icon: CheckCircle, color: "#3b82f6" },
    { label: "Team Members", value: currentMembers.length, icon: Users, color: "#8b5cf6" },
    { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, color: "#22c55e" },
  ];

  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Analytics</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Team performance overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: "#6b7280" }}>{stat.label}</p>
                <p className="text-2xl font-semibold" style={{ color: "#111827" }}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-6 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#111827" }}>Tasks by Status</h2>
          <div className="space-y-4">
            {Object.entries(tasksByStatus).map(([status, count]) => {
              const percentage = currentTasks.length > 0 ? (count / currentTasks.length) * 100 : 0;
              const colors: Record<string, string> = { todo: "#6b7280", "in-progress": "#3b82f6", review: "#f59e0b", completed: "#22c55e" };
              const labels: Record<string, string> = { todo: "To Do", "in-progress": "In Progress", review: "Review", completed: "Done" };
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1"><span className="text-sm" style={{ color: "#374151" }}>{labels[status]}</span><span className="text-sm font-medium" style={{ color: "#6b7280" }}>{count}</span></div>
                  <div className="h-2 rounded-full" style={{ background: "#e5e7eb" }}><div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: colors[status] }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#111827" }}>Tasks by Priority</h2>
          <div className="space-y-4">
            {Object.entries(tasksByPriority).map(([priority, count]) => {
              const percentage = currentTasks.length > 0 ? (count / currentTasks.length) * 100 : 0;
              const colors: Record<string, string> = { Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444" };
              return (
                <div key={priority}>
                  <div className="flex items-center justify-between mb-1"><span className="text-sm capitalize" style={{ color: "#374151" }}>{priority}</span><span className="text-sm font-medium" style={{ color: "#6b7280" }}>{count}</span></div>
                  <div className="h-2 rounded-full" style={{ background: "#e5e7eb" }}><div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: colors[priority] }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#111827" }}>Team Members</h2>
          {memberStats.length > 0 ? (
            <div className="space-y-3">
              {memberStats.map((member) => (
                <div key={member.id} className="p-4 rounded-xl" style={{ background: "#f9fafb", borderColor: "#e5e7eb", border: "1px solid" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "#e0e7ff", color: "#4338ca" }}
                      >
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: "#111827" }}>{member.name}</p>
                        <p className="text-xs" style={{ color: "#9ca3af" }}>{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold" style={{ color: "#111827" }}>{member.totalTasks}</p>
                      <p className="text-xs font-medium" style={{ color: "#22c55e" }}>{member.completedTasks} done</p>
                    </div>
                  </div>
                  {member.totalTasks > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: "#6b7280" }}>Completion</span>
                        <span className="text-xs font-semibold" style={{ color: "#374151" }}>
                          {Math.round((member.completedTasks / member.totalTasks) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "#e5e7eb" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((member.completedTasks / member.totalTasks) * 100)}%`,
                            background: member.completedTasks === member.totalTasks ? "#22c55e" : "#3b82f6"
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {currentTasks
                      .filter((t) =>
                        t.assigneeId === member.id ||
                        (member.userId && t.assigneeId === member.userId) ||
                        t.assigneeIds?.includes(member.id) ||
                        (member.userId && t.assigneeIds?.includes(member.userId))
                      )
                      .slice(0, 3)
                      .map((task) => (
                        <span key={task.id} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#e0e7ff", color: "#4338ca" }}>
                          {task.title.length > 22 ? task.title.slice(0, 22) + "…" : task.title}
                        </span>
                      ))}
                    {member.totalTasks > 3 && (
                      <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: "#f3f4f6", color: "#6b7280" }}>+{member.totalTasks - 3} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: "#6b7280" }}>No team members</p>
          )}
        </div>

        <div className="p-6 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Recent Activity</h2>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActivityPage(Math.max(0, activityPage - 1))}
                  disabled={activityPage === 0}
                  className="px-2 py-1 rounded-lg text-sm disabled:opacity-50"
                  style={{ background: "#f3f4f6" }}
                >
                  ←
                </button>
                <span className="text-xs" style={{ color: "#6b7280" }}>{activityPage + 1} / {totalPages}</span>
                <button 
                  onClick={() => setActivityPage(Math.min(totalPages - 1, activityPage + 1))}
                  disabled={activityPage === totalPages - 1}
                  className="px-2 py-1 rounded-lg text-sm disabled:opacity-50"
                  style={{ background: "#f3f4f6" }}
                >
                  →
                </button>
              </div>
            )}
          </div>
          {paginatedActivities.length > 0 ? (
            <div className="space-y-3">
              {paginatedActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "#f9fafb" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f59e0b20" }}><Activity className="w-4 h-4" style={{ color: "#f59e0b" }} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "#374151" }}>
                      <span className="font-medium">{activity.userName}</span> {activity.action} <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: "#6b7280" }}>No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
