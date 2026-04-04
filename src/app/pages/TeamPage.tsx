import { useState } from "react";
import { useApp, UserRole, Activity } from "@/context/AppContext";
import { UserPlus, Users, Activity as ActivityIcon, Crown, Shield, User, X, Mail, MoreHorizontal, CheckCircle, FolderOpen, MessageSquare, CalendarDays, Megaphone, LogIn, ChevronDown } from "lucide-react";

const ROLE_CONFIG: Record<UserRole, { color: string; bg: string; icon: typeof Crown }> = {
  Owner: { color: "#f59e0b", bg: "#fffbeb", icon: Crown },
  Admin: { color: "#3b82f6", bg: "#eff6ff", icon: Shield },
  Member: { color: "#6b7280", bg: "#f3f4f6", icon: User },
};

const STATUS_COLORS = { Available: "#10b981", Busy: "#ef4444", Away: "#f59e0b", Offline: "#d1d5db" };
const STATUS_LABELS: Record<string, string> = { Available: "🟢 Available", Busy: "🔴 Busy", Away: "🟡 Away", Offline: "⚫ Offline" };

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ACTIVITY_ICONS: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  task: { icon: CheckCircle, color: "#10b981", bg: "#ecfdf5" },
  project: { icon: FolderOpen, color: "#f59e0b", bg: "#fffbeb" },
  member: { icon: UserPlus, color: "#3b82f6", bg: "#eff6ff" },
  announcement: { icon: Megaphone, color: "#8b5cf6", bg: "#f5f3ff" },
  event: { icon: CalendarDays, color: "#06b6d4", bg: "#ecfeff" },
  comment: { icon: MessageSquare, color: "#6b7280", bg: "#f3f4f6" },
  submit: { icon: CheckCircle, color: "#10b981", bg: "#ecfdf5" },
  team: { icon: LogIn, color: "#f59e0b", bg: "#fffbeb" },
};

function InviteMemberModal({ onClose }: { onClose: () => void }) {
  const { addMember } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("Member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await addMember({
        name,
        email,
        avatar: name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
        role,
        status: "Offline",
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: "#111827" }}>Add Member</h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "#9ca3af" }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Full Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" required
              className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
            </div>
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: "0.8125rem" }}>{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border" style={{ borderColor: "#e5e7eb", color: "#374151", fontSize: "0.875rem" }}>Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2"
              style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem", opacity: loading ? 0.7 : 1 }}>
              {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { currentMembers, currentTeam, currentActivities, currentTasks, updateMember } = useApp();
  const [tab, setTab] = useState<"members" | "activity">("members");
  const [showInvite, setShowInvite] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

  // Compute effective status from tasks
  const getEffectiveStatus = (memberId: string, storedStatus: string) => {
    const hasActive = currentTasks.some((t) =>
      t.status === "in-progress" &&
      ((t.assigneeIds?.includes(memberId)) || t.assigneeId === memberId)
    );
    if (hasActive) return "Busy";
    return storedStatus;
  };

  const filteredMembers = currentMembers.filter((m) =>
    !searchQ || m.name.toLowerCase().includes(searchQ.toLowerCase()) || m.email.toLowerCase().includes(searchQ.toLowerCase())
  );

  // Updated stats using effective status
  const busyCount = currentMembers.filter((m) => getEffectiveStatus(m.id, m.status) === "Busy").length;
  const availableCount = currentMembers.filter((m) => getEffectiveStatus(m.id, m.status) === "Available").length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>{currentTeam?.name} Team</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: 4 }}>
            {currentMembers.length} member{currentMembers.length !== 1 ? "s" : ""} · Manage your workspace collaborators
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Members", value: currentMembers.length, color: "#f59e0b", bg: "#fffbeb" },
          { label: "Available", value: availableCount, color: "#10b981", bg: "#ecfdf5" },
          { label: "Busy (on tasks)", value: busyCount, color: "#ef4444", bg: "#fef2f2" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border p-4 text-center" style={{ borderColor: "#f0f0ea" }}>
            <div className="text-2xl mb-1" style={{ fontWeight: 700, color: s.color }}>{s.value}</div>
            <p style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 mb-5 w-fit" style={{ background: "#f3f4f6" }}>
        {[{ id: "members", icon: Users, label: "Members" }, { id: "activity", icon: ActivityIcon, label: "Activity" }].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id as "members" | "activity")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            style={{ background: tab === id ? "white" : "transparent", color: tab === id ? "#111827" : "#6b7280", fontWeight: tab === id ? 600 : 400, fontSize: "0.875rem", boxShadow: tab === id ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "members" ? (
        <>
          <div className="mb-4">
            <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search members..."
              className="w-full max-w-xs px-4 py-2 rounded-xl border outline-none"
              style={{ borderColor: "#e5e5e0", background: "white", fontSize: "0.875rem" }} />
          </div>
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f0f0ea" }}>
            <div className="hidden sm:grid grid-cols-12 px-5 py-3 border-b" style={{ borderColor: "#f0f0ea" }}>
              {[{ label: "Member", cols: 4 }, { label: "Role", cols: 2 }, { label: "Status", cols: 3 }, { label: "Email", cols: 3 }].map(({ label, cols }) => (
                <div key={label} style={{ gridColumn: `span ${cols}`, fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              ))}
            </div>
            {filteredMembers.length === 0 ? (
              <div className="py-12 text-center" style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                {searchQ ? "No members match your search" : "No members yet — add your first one!"}
              </div>
            ) : filteredMembers.map((member) => {
              const roleConf = ROLE_CONFIG[member.role];
              const RoleIcon = roleConf.icon;
              const effectiveStatus = getEffectiveStatus(member.id, member.status);
              const statusColor = STATUS_COLORS[effectiveStatus as keyof typeof STATUS_COLORS] || "#d1d5db";
              const taskCount = currentTasks.filter((t) =>
                t.status === "in-progress" && ((t.assigneeIds?.includes(member.id)) || t.assigneeId === member.id)
              ).length;

              return (
                <div key={member.id} className="flex items-center gap-4 px-5 py-4 transition-colors border-b last:border-b-0"
                  style={{ borderColor: "#f0f0ea" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#fafaf7"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div className="flex items-center gap-3 flex-1 min-w-0" style={{ gridColumn: "span 4" }}>
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: getAvatarColor(member.name), fontWeight: 700, fontSize: "0.875rem" }}>
                        {member.avatar}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: statusColor }} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontWeight: 500, color: "#111827", fontSize: "0.9375rem" }}>{member.name}</p>
                      {taskCount > 0 && <p style={{ fontSize: "0.6875rem", color: "#ef4444", fontWeight: 500 }}>{taskCount} active task{taskCount > 1 ? "s" : ""}</p>}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 w-24 flex-shrink-0">
                    <RoleIcon className="w-3.5 h-3.5" style={{ color: roleConf.color }} />
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: roleConf.bg, color: roleConf.color, fontWeight: 500 }}>{member.role}</span>
                  </div>

                  {/* Status — click to change */}
                  <div className="hidden sm:block w-32 flex-shrink-0 relative">
                    <button onClick={() => setStatusMenuId(statusMenuId === member.id ? null : member.id)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all"
                      style={{ background: "#f9f9f6" }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                      <span style={{ fontSize: "0.8125rem", color: "#374151" }}>{effectiveStatus}</span>
                      <ChevronDown className="w-3 h-3" style={{ color: "#9ca3af" }} />
                    </button>
                    {statusMenuId === member.id && (
                      <div className="absolute left-0 mt-1 w-40 rounded-xl border bg-white shadow-lg z-20 p-1" style={{ borderColor: "#f0f0ea" }}>
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <button key={val} onClick={() => { updateMember(member.id, { status: val as any }); setStatusMenuId(null); }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                            style={{ background: effectiveStatus === val ? "#fffbeb" : "transparent", color: "#374151" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f6"}
                            onMouseLeave={(e) => e.currentTarget.style.background = effectiveStatus === val ? "#fffbeb" : "transparent"}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="hidden sm:block flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{member.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f0f0ea" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#f0f0ea" }}>
            <h3 style={{ color: "#111827" }}>Recent Activity</h3>
            <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginTop: 2 }}>Everything happening in your team</p>
          </div>
          {currentActivities.length === 0 ? (
            <div className="py-16 text-center">
              <ActivityIcon className="w-10 h-10 mx-auto mb-3" style={{ color: "#e5e7eb" }} />
              <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No activity yet</p>
              <p style={{ color: "#d1d5db", fontSize: "0.8125rem", marginTop: 4 }}>Actions will appear here as your team works</p>
            </div>
          ) : (
            <div className="divide-y" style={{ divideColor: "#f0f0ea" }}>
              {currentActivities.slice(0, 30).map((log) => {
                const conf = ACTIVITY_ICONS[log.type] || ACTIVITY_ICONS.task;
                const Icon = conf.icon;
                return (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: conf.bg }}>
                      <Icon className="w-4 h-4" style={{ color: conf.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "0.875rem", color: "#374151" }}>
                        {log.userName && <span style={{ fontWeight: 600, color: "#111827" }}>{log.userName} </span>}
                        {log.action}
                        {log.target && <span style={{ fontWeight: 500, color: "#374151" }}> "{log.target}"</span>}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>{timeAgo(log.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showInvite && <InviteMemberModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
