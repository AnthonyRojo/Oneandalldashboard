import { useApp } from "../context/AppContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AnalyticsPage() {
  const { currentProjects, currentTasks, currentMembers, currentTeam, currentActivities } = useApp();

  const completedTasks = currentTasks.filter((t) => t.status === "completed").length;
  const totalTasks = currentTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeProjects = currentProjects.filter((p) => p.status === "active").length;
  const completedProjects = currentProjects.filter((p) => p.status === "completed").length;
  const avgProgress = currentProjects.length > 0
    ? Math.round(currentProjects.reduce((sum, p) => sum + p.progress, 0) / currentProjects.length)
    : 0;

  // Task by priority
  const taskByPriority = [
    { name: "High", value: currentTasks.filter((t) => t.priority === "High").length, color: "#ef4444" },
    { name: "Medium", value: currentTasks.filter((t) => t.priority === "Medium").length, color: "#f59e0b" },
    { name: "Low", value: currentTasks.filter((t) => t.priority === "Low").length, color: "#10b981" },
  ].filter((d) => d.value > 0);

  // Task by status
  const taskByStatus = [
    { name: "To Do", value: currentTasks.filter((t) => t.status === "todo").length, color: "#e5e7eb" },
    { name: "In Progress", value: currentTasks.filter((t) => t.status === "in-progress").length, color: "#f59e0b" },
    { name: "Completed", value: currentTasks.filter((t) => t.status === "completed").length, color: "#10b981" },
  ].filter((d) => d.value > 0);

  // Project progress
  const projectProgress = currentProjects.map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    progress: p.progress,
    fill: p.color,
  }));

  // Member activity
  const memberActivity = currentMembers.map((m) => ({
    name: m.name.split(" ")[0],
    avatar: m.avatar,
    fullName: m.name,
    tasks: currentTasks.filter((t) => t.assigneeId === m.id).length,
    completed: currentTasks.filter((t) => t.assigneeId === m.id && t.status === "completed").length,
  })).sort((a, b) => b.tasks - a.tasks);

  // Activity trend — last 7 days from real activities
  const today = new Date();
  const activityTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = d.toISOString().split("T")[0];
    const dayActs = currentActivities.filter((a) => a.createdAt?.startsWith(dateStr));
    return {
      day: label,
      actions: dayActs.length,
      completed: dayActs.filter((a) => a.action === "completed task").length,
    };
  });

  const KPI_CARDS = [
    {
      label: "Task Completion Rate",
      value: `${completionRate}%`,
      desc: `${completedTasks} of ${totalTasks} tasks`,
    },
    {
      label: "Active Projects",
      value: activeProjects,
      desc: `${completedProjects} completed`,
    },
    {
      label: "Avg Project Progress",
      value: `${avgProgress}%`,
      desc: "Across all projects",
    },
    {
      label: "Team Size",
      value: currentMembers.length,
      desc: "Active collaborators",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>Analytics</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: 4 }}>
          {currentTeam?.name} team performance and productivity insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPI_CARDS.map(({ label, value, desc }) => (
          <div key={label} className="bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
            <p style={{ fontSize: "0.8125rem", color: "#6b7280", fontWeight: 500, marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: "1.875rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 6 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 7-Day Activity Trend — real data */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
          <h3 className="mb-1" style={{ color: "#111827" }}>7-Day Activity</h3>
          <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginBottom: 16 }}>Team actions and task completions per day</p>
          {activityTrend.every((d) => d.actions === 0) ? (
            <div className="h-[220px] flex items-center justify-center flex-col gap-2" style={{ color: "#9ca3af" }}>
              <TrendingUp className="w-8 h-8" style={{ color: "#e5e7eb" }} />
              <p style={{ fontSize: "0.875rem" }}>Activity will appear as your team works</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={activityTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ea" />
                <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0ea" }} />
                <Legend />
                <Line type="monotone" dataKey="actions" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4 }} name="Total Actions" />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 4 }} name="Completions" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Task Priority Distribution */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
          <h3 className="mb-1" style={{ color: "#111827" }}>Task Priority Distribution</h3>
          <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginBottom: 4 }}>Breakdown by priority level</p>
          {taskByPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={taskByPriority} cx="50%" cy="50%" outerRadius={85} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {taskByPriority.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0ea" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center" style={{ color: "#9ca3af" }}>Create tasks to see priority distribution</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Task Status Distribution */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
          <h3 className="mb-1" style={{ color: "#111827" }}>Task Status Distribution</h3>
          <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginBottom: 4 }}>Breakdown by current status</p>
          {taskByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={taskByStatus} cx="50%" cy="50%" outerRadius={85} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {taskByStatus.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0ea" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center" style={{ color: "#9ca3af" }}>No tasks yet</div>
          )}
        </div>

        {/* Project Progress */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
          <h3 className="mb-1" style={{ color: "#111827" }}>Project Progress</h3>
          <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginBottom: 16 }}>Completion % per project</p>
          {projectProgress.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projectProgress} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ea" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#374151", fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0ea" }} formatter={(v) => [`${v}%`, "Progress"]} />
                <Bar dataKey="progress" radius={[0, 6, 6, 0]}>
                  {projectProgress.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center" style={{ color: "#9ca3af" }}>Create projects to see progress</div>
          )}
        </div>
      </div>

      {/* Member Activity */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
        <h3 className="mb-1" style={{ color: "#111827" }}>Member Activity</h3>
        <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginBottom: 16 }}>Tasks assigned and completed per member</p>
        {memberActivity.some((m) => m.tasks > 0) ? (
          <div className="space-y-3">
            {memberActivity.map((m) => (
              <div key={m.fullName}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ background: getAvatarColor(m.fullName), fontWeight: 700 }}>
                      {m.avatar}
                    </div>
                    <span style={{ fontSize: "0.8125rem", color: "#374151", fontWeight: 500 }}>{m.name}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{m.completed}/{m.tasks} tasks</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "#f0f0ea" }}>
                  {m.tasks > 0 && (
                    <div className="h-full rounded-full" style={{
                      width: `${Math.round((m.completed / m.tasks) * 100)}%`,
                      background: getAvatarColor(m.fullName),
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[80px] flex items-center justify-center" style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
            Assign tasks to members to see activity
          </div>
        )}
      </div>
    </div>
  );
}