import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router";
import { useApp } from "../context/AppContext";
import {
  LayoutDashboard, CheckSquare, Calendar, Megaphone, BarChart2,
  Users, Settings, HelpCircle, LogOut, Zap, ChevronDown, Plus,
  Bell, MessageSquare, Search, X, Check, Loader2
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/app/dashboard" },
  { label: "Tasks", icon: CheckSquare, path: "/app/tasks" },
  { label: "Calendar", icon: Calendar, path: "/app/calendar" },
  { label: "Announcements", icon: Megaphone, path: "/app/announcements" },
  { label: "Analytics", icon: BarChart2, path: "/app/analytics" },
  { label: "Team", icon: Users, path: "/app/team" },
];

const BOTTOM_ITEMS = [
  { label: "Settings", icon: Settings, path: "/app/settings" },
  { label: "Help", icon: HelpCircle, path: "/app/help" },
];

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316", "#06b6d4"];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthLoading } = useApp();
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
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LayoutContent() {
  const { currentUser, logout, teams, currentTeamId, setCurrentTeamId, createTeam, currentTeam, searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLoading, setNewTeamLoading] = useState(false);
  const [newTeamError, setNewTeamError] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTeamDropdownOpen(false);
        setNewTeamOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => { logout(); navigate("/"); };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setNewTeamLoading(true);
    setNewTeamError("");
    try {
      await createTeam(newTeamName.trim());
      setNewTeamName("");
      setNewTeamOpen(false);
      setTeamDropdownOpen(false);
    } catch (err: any) {
      setNewTeamError(err.message || "Failed to create team.");
    } finally {
      setNewTeamLoading(false);
    }
  };

  const notifications = [
    { id: 1, text: "Sarah Chen commented on your task", time: "2m ago", read: false },
    { id: 2, text: "New project 'Q4 Campaign' was created", time: "1h ago", read: false },
    { id: 3, text: "Marcus completed 'Audit website'", time: "3h ago", read: true },
    { id: 4, text: "Team meeting in 30 minutes", time: "5h ago", read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#fafaf7" }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: 240, background: "#111827", flexShrink: 0 }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#f59e0b" }}>
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span style={{ color: "white", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>One&All</span>
        </div>

        {/* Team Switcher */}
        <div className="px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p style={{ color: "#6b7280", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Workspace</p>
          <div ref={dropdownRef} className="relative">
            <button onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
                style={{ background: currentTeam?.color || "#f59e0b", fontWeight: 700 }}>
                {currentTeam?.name?.[0] || "T"}
              </div>
              <span className="flex-1 text-left truncate" style={{ color: "white", fontSize: "0.875rem", fontWeight: 500 }}>
                {currentTeam?.name || "Select Team"}
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "#6b7280" }} />
            </button>

            {teamDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-50" style={{ background: "#1f2937", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                <div className="p-2">
                  {teams.map((team) => (
                    <button key={team.id} onClick={() => { setCurrentTeamId(team.id); setTeamDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
                      style={{ background: currentTeamId === team.id ? "rgba(245,158,11,0.15)" : "transparent" }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ background: team.color, fontSize: "0.75rem", fontWeight: 700 }}>
                        {team.name[0]}
                      </div>
                      <span style={{ color: "white", fontSize: "0.8125rem" }}>{team.name}</span>
                      {currentTeamId === team.id && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: "#f59e0b" }} />}
                    </button>
                  ))}
                </div>
                <div className="border-t p-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  {!newTeamOpen ? (
                    <button onClick={() => { setNewTeamOpen(true); setNewTeamError(""); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                      style={{ color: "#f59e0b" }}>
                      <Plus className="w-4 h-4" />
                      <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>New Team</span>
                    </button>
                  ) : (
                    <div className="px-2 pb-1">
                      <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                        placeholder="Team name..."
                        className="w-full px-3 py-1.5 rounded-lg outline-none mb-1"
                        style={{ background: "rgba(255,255,255,0.08)", color: "white", fontSize: "0.8125rem", border: "1px solid rgba(255,255,255,0.1)" }}
                        autoFocus />
                      {newTeamError && (
                        <p style={{ color: "#ef4444", fontSize: "0.75rem", marginBottom: 6 }}>{newTeamError}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <button onClick={handleCreateTeam} disabled={newTeamLoading || !newTeamName.trim()}
                          className="flex-1 py-1 rounded-lg text-black flex items-center justify-center gap-1"
                          style={{ background: "#f59e0b", fontSize: "0.75rem", fontWeight: 600, opacity: newTeamLoading ? 0.7 : 1 }}>
                          {newTeamLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                          {newTeamLoading ? "Creating..." : "Create"}
                        </button>
                        <button onClick={() => { setNewTeamOpen(false); setNewTeamError(""); }}
                          className="flex-1 py-1 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af", fontSize: "0.75rem" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p style={{ color: "#6b7280", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 8 }}>Main Menu</p>
          <div className="space-y-1">
            {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
              const active = location.pathname === path;
              return (
                <button key={path} onClick={() => { navigate(path); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
                  style={{
                    background: active ? "rgba(245,158,11,0.15)" : "transparent",
                    color: active ? "#f59e0b" : "#9ca3af",
                  }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span style={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400 }}>{label}</span>
                  {label === "Announcements" && (
                    <span className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-black" style={{ background: "#f59e0b", fontSize: "0.6875rem", fontWeight: 700 }}>3</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <p style={{ color: "#6b7280", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 8 }}>General</p>
            <div className="space-y-1">
              {BOTTOM_ITEMS.map(({ label, icon: Icon, path }) => {
                const active = location.pathname === path;
                return (
                  <button key={path} onClick={() => { navigate(path); setSidebarOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
                    style={{ background: active ? "rgba(245,158,11,0.15)" : "transparent", color: active ? "#f59e0b" : "#9ca3af" }}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span style={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400 }}>{label}</span>
                  </button>
                );
              })}
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
                style={{ color: "#9ca3af" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.1)"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}>
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span style={{ fontSize: "0.875rem" }}>Logout</span>
              </button>
            </div>
          </div>
        </nav>

        {/* User profile */}
        <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
              style={{ background: getAvatarColor(currentUser?.name || "A"), fontWeight: 700 }}>
              {currentUser?.avatar || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ color: "white", fontSize: "0.8125rem", fontWeight: 500 }}>{currentUser?.name}</p>
              <p className="truncate" style={{ color: "#6b7280", fontSize: "0.75rem" }}>{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="flex-shrink-0 flex items-center gap-4 px-6 py-3.5 border-b bg-white" style={{ borderColor: "#f0f0ea" }}>
          {/* Hamburger */}
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg" style={{ color: "#6b7280" }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-16 py-2 rounded-xl border outline-none transition-all"
              style={{ background: "#f9f9f6", borderColor: "#e5e5e0", fontSize: "0.875rem", color: "#374151" }}
              onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
              onBlur={(e) => e.target.style.borderColor = "#e5e5e0"}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-xs" style={{ background: "#e5e7eb", color: "#6b7280" }}>⌘K</span>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                className="relative p-2 rounded-xl transition-colors"
                style={{ color: "#6b7280" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ background: "#f59e0b", fontSize: "0.625rem", fontWeight: 700 }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border bg-white shadow-xl z-50" style={{ borderColor: "#f0f0ea" }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#f0f0ea" }}>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#111827" }}>Notifications</h3>
                    <button onClick={() => setNotifOpen(false)} style={{ color: "#9ca3af" }}><X className="w-4 h-4" /></button>
                  </div>
                  <div>
                    {notifications.map((n) => (
                      <div key={n.id} className="px-4 py-3 flex items-start gap-3 border-b last:border-b-0" style={{ background: n.read ? "transparent" : "#fffbeb", borderColor: "#f0f0ea" }}>
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.read ? "#d1d5db" : "#f59e0b" }} />
                        <div>
                          <p style={{ fontSize: "0.8125rem", color: "#374151" }}>{n.text}</p>
                          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <button className="p-2 rounded-xl transition-colors" style={{ color: "#6b7280" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Profile */}
            <div className="relative ml-1">
              <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ background: getAvatarColor(currentUser?.name || "A"), fontWeight: 700 }}>
                  {currentUser?.avatar || "A"}
                </div>
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
                    <button onClick={() => { navigate("/app/settings"); setProfileOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl transition-colors"
                      style={{ fontSize: "0.875rem", color: "#374151" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f6"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      Settings
                    </button>
                    <button onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl transition-colors"
                      style={{ fontSize: "0.875rem", color: "#ef4444" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: "#fafaf7" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function MainLayout() {
  return (
    <AuthGuard>
      <LayoutContent />
    </AuthGuard>
  );
}