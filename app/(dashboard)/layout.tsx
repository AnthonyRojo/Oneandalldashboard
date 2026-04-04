"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useApp, ChatMessage } from "@/context/AppContext";
import {
  LayoutDashboard, CheckSquare, Calendar, Megaphone, BarChart2,
  Users, Settings, HelpCircle, LogOut, Zap, ChevronDown, Plus,
  Bell, MessageSquare, Search, X, Check, Loader2, Send, Pencil, Trash2,
  Hash, UserPlus
} from "lucide-react";

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316", "#06b6d4"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const NOTIF_NAV: Record<string, string> = {
  task: "/tasks", project: "/dashboard", member: "/team",
  announcement: "/announcements", event: "/calendar",
  comment: "/announcements", submit: "/tasks", team: "/dashboard",
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fafaf7" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f59e0b" }}>
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#f59e0b" }} />
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const {
    currentUser, logout, teams, currentTeamId, setCurrentTeamId, createTeam, currentTeam,
    searchQuery, setSearchQuery, currentActivities, currentMessages, sendMessage, editMessage,
    deleteMessage, loadMessages, chatGroups, createChatGroup, currentMembers,
  } = useApp();

  const router = useRouter();
  const pathname = usePathname();
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLoading, setNewTeamLoading] = useState(false);
  const [newTeamError, setNewTeamError] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [lastReadNotif, setLastReadNotif] = useState(() => typeof window !== "undefined" ? localStorage.getItem("lastReadNotif") || "" : "");
  const [chatLoading, setChatLoading] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const notifications = [...currentActivities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);
  const unreadNotifCount = notifications.filter((n) => n.createdAt > lastReadNotif).length;
  const activeMessages = activeGroupId === null
    ? currentMessages.filter((m: ChatMessage) => !m.groupId)
    : currentMessages.filter((m: ChatMessage) => m.groupId === activeGroupId);

  const handleOpenNotif = () => {
    setNotifOpen(!notifOpen); setChatOpen(false); setProfileOpen(false);
    if (!notifOpen) {
      const now = new Date().toISOString();
      setLastReadNotif(now);
      if (typeof window !== "undefined") localStorage.setItem("lastReadNotif", now);
    }
  };

  const handleOpenChat = async () => {
    setChatOpen(!chatOpen); setNotifOpen(false); setProfileOpen(false);
    if (!chatOpen) {
      setChatLoading(true);
      await loadMessages().catch(() => {});
      setChatLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    const content = chatMessage;
    setChatMessage("");
    await sendMessage(content, activeGroupId || undefined);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await createChatGroup(newGroupName, newGroupMembers);
    setNewGroupName(""); setNewGroupMembers([]); setShowNewGroup(false);
  };

  useEffect(() => {
    if (chatOpen && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, chatOpen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setNotifOpen(false); setChatOpen(false); setProfileOpen(false); setEditingMsgId(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTeamDropdownOpen(false); setNewTeamOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => { logout(); router.push("/"); };
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setNewTeamLoading(true); setNewTeamError("");
    try {
      await createTeam(newTeamName.trim());
      setNewTeamName(""); setNewTeamOpen(false); setTeamDropdownOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed.";
      setNewTeamError(errorMessage);
    } finally { setNewTeamLoading(false); }
  };

  const NAV_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Tasks", icon: CheckSquare, path: "/tasks" },
    { label: "Calendar", icon: Calendar, path: "/calendar" },
    { label: "Announcements", icon: Megaphone, path: "/announcements" },
    { label: "Analytics", icon: BarChart2, path: "/analytics" },
    { label: "Team", icon: Users, path: "/team" },
  ];
  const BOTTOM_ITEMS = [
    { label: "Settings", icon: Settings, path: "/settings" },
    { label: "Help", icon: HelpCircle, path: "/help" },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#fafaf7" }}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: 240, background: "#111827", flexShrink: 0 }}>
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#f59e0b" }}>
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span style={{ color: "white", fontWeight: 700, fontSize: "1.1rem" }}>One&All</span>
        </div>

        {/* Team switcher */}
        <div className="px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p style={{ color: "#6b7280", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Workspace</p>
          <div ref={dropdownRef} className="relative">
            <button onClick={() => setTeamDropdownOpen(!teamDropdownOpen)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: currentTeam?.color || "#f59e0b" }}>{currentTeam?.name?.[0] || "T"}</div>
              <span className="flex-1 text-left truncate" style={{ color: "white", fontSize: "0.875rem", fontWeight: 500 }}>{currentTeam?.name || "Select Team"}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "#6b7280" }} />
            </button>
            {teamDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-50" style={{ background: "#1f2937", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                <div className="p-2">
                  {teams.map((t) => (
                    <button key={t.id} onClick={() => { setCurrentTeamId(t.id); setTeamDropdownOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: currentTeamId === t.id ? "rgba(245,158,11,0.15)" : "transparent" }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ background: t.color }}>{t.name[0]}</div>
                      <span style={{ color: "white", fontSize: "0.8125rem" }}>{t.name}</span>
                      {currentTeamId === t.id && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: "#f59e0b" }} />}
                    </button>
                  ))}
                </div>
                <div className="border-t p-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  {!newTeamOpen ? (
                    <button onClick={() => { setNewTeamOpen(true); setNewTeamError(""); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg" style={{ color: "#f59e0b" }}>
                      <Plus className="w-4 h-4" /><span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>New Team</span>
                    </button>
                  ) : (
                    <div className="px-2 pb-1">
                      <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()} placeholder="Team name..." className="w-full px-3 py-1.5 rounded-lg outline-none mb-1" style={{ background: "rgba(255,255,255,0.08)", color: "white", fontSize: "0.8125rem", border: "1px solid rgba(255,255,255,0.1)" }} autoFocus />
                      {newTeamError && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginBottom: 6 }}>{newTeamError}</p>}
                      <div className="flex gap-2 mt-1">
                        <button onClick={handleCreateTeam} disabled={newTeamLoading || !newTeamName.trim()} className="flex-1 py-1 rounded-lg text-black flex items-center justify-center gap-1" style={{ background: "#f59e0b", fontSize: "0.75rem", fontWeight: 600, opacity: newTeamLoading ? 0.7 : 1 }}>
                          {newTeamLoading && <Loader2 className="w-3 h-3 animate-spin" />}{newTeamLoading ? "Creating..." : "Create"}
                        </button>
                        <button onClick={() => { setNewTeamOpen(false); setNewTeamError(""); }} className="flex-1 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af", fontSize: "0.75rem" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p style={{ color: "#6b7280", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 8 }}>Main Menu</p>
          <div className="space-y-1">
            {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
              const active = pathname === path;
              return (
                <button key={path} onClick={() => { router.push(path); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left" style={{ background: active ? "rgba(245,158,11,0.15)" : "transparent", color: active ? "#f59e0b" : "#9ca3af" }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span style={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400 }}>{label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6">
            <p style={{ color: "#6b7280", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 8 }}>General</p>
            <div className="space-y-1">
              {BOTTOM_ITEMS.map(({ label, icon: Icon, path }) => {
                const active = pathname === path;
                return (
                  <button key={path} onClick={() => { router.push(path); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left" style={{ background: active ? "rgba(245,158,11,0.15)" : "transparent", color: active ? "#f59e0b" : "#9ca3af" }}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span style={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400 }}>{label}</span>
                  </button>
                );
              })}
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left" style={{ color: "#9ca3af" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.1)"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}>
                <LogOut className="w-4 h-4 flex-shrink-0" /><span style={{ fontSize: "0.875rem" }}>Logout</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: getAvatarColor(currentUser?.name || "A") }}>{currentUser?.avatar || "A"}</div>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ color: "white", fontSize: "0.8125rem", fontWeight: 500 }}>{currentUser?.name}</p>
              <p className="truncate" style={{ color: "#6b7280", fontSize: "0.75rem" }}>{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center gap-4 px-6 py-3.5 border-b bg-white" style={{ borderColor: "#f0f0ea" }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg" style={{ color: "#6b7280" }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
            <input ref={searchRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..."
              className="w-full pl-9 pr-16 py-2 rounded-xl border outline-none transition-all"
              style={{ background: "#f9f9f6", borderColor: "#e5e5e0", fontSize: "0.875rem", color: "#374151" }}
              onFocus={(e) => e.target.style.borderColor = "#f59e0b"} onBlur={(e) => e.target.style.borderColor = "#e5e5e0"} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-xs" style={{ background: "#e5e7eb", color: "#6b7280" }}>⌘K</span>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Notifications */}
            <div className="relative">
              <button onClick={handleOpenNotif} className="relative p-2 rounded-xl transition-colors" style={{ color: notifOpen ? "#f59e0b" : "#6b7280", background: notifOpen ? "#fffbeb" : "transparent" }}>
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ background: "#f59e0b", fontSize: "0.625rem", fontWeight: 700 }}>{unreadNotifCount > 9 ? "9+" : unreadNotifCount}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 rounded-2xl border bg-white shadow-xl z-50 overflow-hidden" style={{ borderColor: "#f0f0ea", width: 340 }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#f0f0ea" }}>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#111827" }}>Notifications</h3>
                    <button onClick={() => setNotifOpen(false)} style={{ color: "#9ca3af" }}><X className="w-4 h-4" /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center"><Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "#d1d5db" }} /><p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>No activity yet</p></div>
                    ) : notifications.map((n) => {
                      const icon = ({ task: "✅", project: "📁", member: "👤", announcement: "📢", event: "📅", comment: "💬", submit: "📤", team: "🏠" } as Record<string, string>)[n.type] || "📌";
                      const isNew = n.createdAt > lastReadNotif;
                      return (
                        <button key={n.id} className="w-full text-left px-4 py-3 flex items-start gap-3 border-b last:border-b-0 transition-all"
                          style={{ background: isNew ? "#fffbeb" : "transparent", borderColor: "#f0f0ea" }}
                          onClick={() => { router.push(NOTIF_NAV[n.type] || "/dashboard"); setNotifOpen(false); }}
                          onMouseEnter={(e) => e.currentTarget.style.background = isNew ? "#fef9e7" : "#f9f9f6"}
                          onMouseLeave={(e) => e.currentTarget.style.background = isNew ? "#fffbeb" : "transparent"}>
                          <span style={{ fontSize: "1rem", lineHeight: 1, marginTop: 1 }}>{icon}</span>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontSize: "0.8125rem", color: "#374151" }}>
                              <span style={{ fontWeight: 600 }}>{n.userName || "Someone"}</span> {n.action}
                              {n.target && <span style={{ color: "#111827", fontWeight: 500 }}> &quot;{n.target.slice(0, 40)}&quot;</span>}
                            </p>
                            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>{timeAgo(n.createdAt)}</p>
                          </div>
                          {isNew && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#f59e0b" }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="relative">
              <button onClick={handleOpenChat} className="relative p-2 rounded-xl transition-colors" style={{ color: chatOpen ? "#f59e0b" : "#6b7280", background: chatOpen ? "#fffbeb" : "transparent" }} title="Team Chat">
                <MessageSquare className="w-5 h-5" />
                {currentMessages.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: "#10b981" }} />}
              </button>

              {chatOpen && (
                <div className="absolute right-0 mt-2 rounded-2xl border bg-white shadow-xl z-50 flex flex-col overflow-hidden" style={{ borderColor: "#f0f0ea", width: 340, height: 480 }}>
                  {/* Header */}
                  <div className="flex-shrink-0" style={{ background: "#111827" }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" style={{ color: "#f59e0b" }} />
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "white" }}>
                          {activeGroupId ? chatGroups.find((g) => g.id === activeGroupId)?.name || "Group" : `${currentTeam?.name || "Team"} Chat`}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setShowNewGroup(!showNewGroup)} className="p-1.5 rounded-lg" style={{ color: "#9ca3af" }} title="New group"><UserPlus className="w-4 h-4" /></button>
                        <button onClick={() => setChatOpen(false)} style={{ color: "#9ca3af" }}><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {/* Channel tabs */}
                    <div className="flex overflow-x-auto px-2 py-1.5 gap-1" style={{ scrollbarWidth: "none" }}>
                      <button onClick={() => setActiveGroupId(null)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0"
                        style={{ background: activeGroupId === null ? "rgba(245,158,11,0.25)" : "transparent", color: activeGroupId === null ? "#f59e0b" : "#6b7280" }}>
                        <Hash className="w-3 h-3" /> Team
                      </button>
                      {chatGroups.map((g) => (
                        <button key={g.id} onClick={() => setActiveGroupId(g.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0"
                          style={{ background: activeGroupId === g.id ? "rgba(245,158,11,0.25)" : "transparent", color: activeGroupId === g.id ? "#f59e0b" : "#6b7280" }}>
                          <Hash className="w-3 h-3" /> {g.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* New group form */}
                  {showNewGroup && (
                    <div className="flex-shrink-0 p-3 border-b" style={{ borderColor: "#f0f0ea", background: "#fffbeb" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>Create Group Chat</p>
                      <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name"
                        className="w-full px-3 py-1.5 rounded-lg border outline-none mb-2" style={{ fontSize: "0.8125rem", borderColor: "#e5e7eb" }} />
                      <p style={{ fontSize: "0.6875rem", color: "#9ca3af", marginBottom: 4 }}>Select members:</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {currentMembers.map((m) => (
                          <button key={m.id} onClick={() => setNewGroupMembers((prev) => prev.includes(m.id) ? prev.filter((i) => i !== m.id) : [...prev, m.id])}
                            className="px-2 py-0.5 rounded-full text-xs transition-all"
                            style={{ background: newGroupMembers.includes(m.id) ? "#f59e0b" : "#f3f4f6", color: newGroupMembers.includes(m.id) ? "#111827" : "#374151", fontWeight: newGroupMembers.includes(m.id) ? 600 : 400 }}>
                            {m.name.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleCreateGroup} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#f59e0b", color: "#111827" }}>Create</button>
                        <button onClick={() => setShowNewGroup(false)} className="flex-1 py-1.5 rounded-lg text-xs" style={{ background: "#f3f4f6", color: "#6b7280" }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatLoading ? (
                      <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#f59e0b" }} /></div>
                    ) : activeMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                        <MessageSquare className="w-8 h-8" style={{ color: "#e5e7eb" }} />
                        <p style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>No messages yet</p>
                      </div>
                    ) : activeMessages.map((msg: ChatMessage) => {
                      const isMe = msg.authorId === currentUser?.id;
                      const isEditing = editingMsgId === msg.id;
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 group ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                          {!isMe && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0 text-xs font-bold" style={{ background: getAvatarColor(msg.authorName) }}>
                              {msg.authorName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                          )}
                          <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                            {!isMe && <span style={{ fontSize: "0.6875rem", color: "#9ca3af", paddingLeft: 4 }}>{msg.authorName}</span>}
                            {isEditing ? (
                              <div className="flex gap-1 items-center">
                                <input value={editingMsgText} onChange={(e) => setEditingMsgText(e.target.value)}
                                  className="px-2 py-1.5 rounded-xl border outline-none text-sm" style={{ borderColor: "#f59e0b", minWidth: 0 }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { editMessage(msg.id, editingMsgText); setEditingMsgId(null); }
                                    if (e.key === "Escape") setEditingMsgId(null);
                                  }} autoFocus />
                                <button onClick={() => { editMessage(msg.id, editingMsgText); setEditingMsgId(null); }} style={{ color: "#10b981" }}><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingMsgId(null)} style={{ color: "#9ca3af" }}><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="relative">
                                <div className="px-3 py-2 rounded-2xl"
                                  style={{ background: msg.deleted ? "#f3f4f6" : isMe ? "#f59e0b" : "#f3f4f6", color: msg.deleted ? "#9ca3af" : isMe ? "#111827" : "#374151", borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4, fontStyle: msg.deleted ? "italic" : "normal" }}>
                                  <p style={{ fontSize: "0.8125rem", lineHeight: 1.4, wordBreak: "break-word" }}>{msg.content}</p>
                                </div>
                                {isMe && !msg.deleted && (
                                  <div className={`absolute top-0 right-full mr-1 hidden group-hover:flex gap-0.5`}>
                                    <button onClick={() => { setEditingMsgId(msg.id); setEditingMsgText(msg.content); }} className="w-6 h-6 rounded-lg flex items-center justify-center bg-white" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                                      <Pencil className="w-3 h-3" style={{ color: "#6b7280" }} />
                                    </button>
                                    <button onClick={() => deleteMessage(msg.id)} className="w-6 h-6 rounded-lg flex items-center justify-center bg-white" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                                      <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            <span style={{ fontSize: "0.625rem", color: "#d1d5db", padding: "0 4px" }}>
                              {timeAgo(msg.createdAt)}{msg.editedAt && " (edited)"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t flex-shrink-0" style={{ borderColor: "#f0f0ea" }}>
                    <div className="flex gap-2">
                      <input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        placeholder={activeGroupId ? "Message group..." : "Message the team..."}
                        className="flex-1 px-3 py-2 rounded-xl border outline-none" style={{ fontSize: "0.8125rem", borderColor: "#e5e7eb", background: "#fafaf7" }} />
                      <button onClick={handleSendMessage} disabled={!chatMessage.trim()} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: chatMessage.trim() ? "#f59e0b" : "#f3f4f6" }}>
                        <Send className="w-3.5 h-3.5" style={{ color: chatMessage.trim() ? "#111827" : "#9ca3af" }} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative ml-1">
              <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); setChatOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: getAvatarColor(currentUser?.name || "A") }}>{currentUser?.avatar || "A"}</div>
                <span className="hidden sm:block" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>{currentUser?.name?.split(" ")[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 hidden sm:block" style={{ color: "#9ca3af" }} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white shadow-xl z-50" style={{ borderColor: "#f0f0ea" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "#f0f0ea" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827" }}>{currentUser?.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{currentUser?.email}</p>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { router.push("/settings"); setProfileOpen(false); }} className="w-full text-left px-3 py-2 rounded-xl transition-colors" style={{ fontSize: "0.875rem", color: "#374151" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f6"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>Settings</button>
                    <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-xl transition-colors" style={{ fontSize: "0.875rem", color: "#ef4444" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: "#fafaf7" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <LayoutContent>{children}</LayoutContent>
    </AuthGuard>
  );
}
