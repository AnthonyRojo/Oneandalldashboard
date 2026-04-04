"use client";

import { useApp } from "@/context/AppContext";
import { TrendingUp, Users, CheckCircle, Calendar, Activity } from "lucide-react";

export default function AnalyticsPage() {
  const { currentTasks, currentMembers, currentEvents, currentActivities } = useApp();

  const tasksByStatus = {
    todo: currentTasks.filter((t) => t.status === "todo").length,
    "in-progress": currentTasks.filter((t) => t.status === "in-progress").length,
    review: currentTasks.filter((t) => t.status === "review").length,
    completed: currentTasks.filter((t) => t.status === "completed").length,
  };

  const tasksByPriority = {
    low: currentTasks.filter((t) => t.priority === "low").length,
    medium: currentTasks.filter((t) => t.priority === "medium").length,
    high: currentTasks.filter((t) => t.priority === "high").length,
  };

  const completionRate = currentTasks.length > 0 ? Math.round((tasksByStatus.completed / currentTasks.length) * 100) : 0;
  const upcomingEvents = currentEvents.filter((e) => new Date(e.startTime) > new Date()).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 5);
  const recentActivities = [...currentActivities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  const stats = [
    { label: "Total Tasks", value: currentTasks.length, icon: CheckCircle, color: "#3b82f6" },
    { label: "Team Members", value: currentMembers.length, icon: Users, color: "#8b5cf6" },
    { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, color: "#22c55e" },
    { label: "Upcoming Events", value: upcomingEvents.length, icon: Calendar, color: "#f59e0b" },
  ];

  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Analytics</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Team performance overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              const colors: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
              return (
                <div key={priority}>
                  <div className="flex items-center justify-between mb-1"><span className="text-sm capitalize" style={{ color: "#374151" }}>{priority}</span><span className="text-sm font-medium" style={{ color: "#6b7280" }}>{count}</span></div>
                  <div className="h-2 rounded-full" style={{ background: "#e5e7eb" }}><div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: colors[priority] }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#111827" }}>Upcoming Events</h2>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f9fafb" }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#3b82f620" }}><Calendar className="w-5 h-5" style={{ color: "#3b82f6" }} /></div>
                  <div className="flex-1 min-w-0"><p className="font-medium truncate" style={{ color: "#111827" }}>{event.title}</p><p className="text-sm" style={{ color: "#6b7280" }}>{new Date(event.startTime).toLocaleDateString()}</p></div>
                </div>
              ))}
            </div>
          ) : (<p className="text-center py-8" style={{ color: "#6b7280" }}>No upcoming events</p>)}
        </div>

        <div className="p-6 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#111827" }}>Recent Activity</h2>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f59e0b20" }}><Activity className="w-4 h-4" style={{ color: "#f59e0b" }} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "#374151" }}>
                      {activity.userName} {activity.action} {activity.target}
                    </p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (<p className="text-center py-8" style={{ color: "#6b7280" }}>No recent activity</p>)}
        </div>
      </div>
    </div>
  );
}
