import { useState } from "react";
import { useApp } from "../context/AppContext";
import { User, Bell, Lock, Palette, Globe, Trash2, Save, ChevronRight, Eye, EyeOff, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316"];
function getAvatarColor(n: string) {
  let hash = 0;
  for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function SettingsPage() {
  const { currentUser, currentTeam, teams, accessToken } = useApp();
  const [activeSection, setActiveSection] = useState("profile");

  // Profile
  const [name, setName] = useState(currentUser?.name || "");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  // Notifications
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("notifications");
    return saved ? JSON.parse(saved) : {
      taskAssigned: true,
      taskCompleted: true,
      mentions: true,
      announcements: true,
      weeklyDigest: false,
      deadlineReminders: true,
    };
  });
  const [notificationSaved, setNotificationSaved] = useState(false);

  const handleSaveProfile = async () => {
    setSaveError("");
    try {
      const { error } = await supabase.auth.updateUser({ data: { name } });
      if (error) { setSaveError(error.message); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save changes");
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!newPw) { setPwError("Please enter a new password"); return; }
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    setPwSaving(true);
    try {
      // Verify current password first by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser?.email || "",
        password: currentPw,
      });
      if (signInError) { setPwError("Current password is incorrect"); setPwSaving(false); return; }
      // Change password via server
      await api.changePassword(newPw, accessToken!);
      setPwSaved(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err: any) {
      setPwError(err.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const SECTIONS = [
    { id: "profile", icon: User, label: "Profile" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "security", icon: Lock, label: "Security" },
    { id: "appearance", icon: Palette, label: "Appearance" },
    { id: "workspace", icon: Globe, label: "Workspace" },
  ];

  const inputStyle = { borderColor: "#e5e7eb", fontSize: "0.875rem" };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>Settings</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: 4 }}>Manage your account and workspace preferences</p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Sidebar nav */}
        <div className="md:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left"
                style={{
                  background: activeSection === id ? "#fffbeb" : "transparent",
                  color: activeSection === id ? "#f59e0b" : "#374151",
                  fontWeight: activeSection === id ? 600 : 400,
                  fontSize: "0.875rem",
                }}>
                <Icon className="w-4 h-4" />
                {label}
                {activeSection === id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === "profile" && (
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "#f0f0ea" }}>
              <h2 className="mb-5" style={{ color: "#111827" }}>Profile Settings</h2>
              <div className="flex items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: "#f0f0ea" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl"
                  style={{ background: getAvatarColor(currentUser?.name || "A"), fontWeight: 700 }}>
                  {currentUser?.avatar}
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "#111827" }}>{currentUser?.name}</p>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{currentUser?.email}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Full Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Email Address</label>
                  <input type="email" value={currentUser?.email || ""} disabled
                    className="w-full px-4 py-2.5 rounded-xl border outline-none"
                    style={{ ...inputStyle, background: "#f9f9f6", color: "#9ca3af" }} />
                  <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>Email cannot be changed</p>
                </div>
                <button onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors"
                  style={{ background: saved ? "#10b981" : "#f59e0b", color: saved ? "white" : "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Saved!" : "Save Changes"}
                </button>
                {saveError && <p style={{ color: "#ef4444", fontSize: "0.8125rem" }}>{saveError}</p>}
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "#f0f0ea" }}>
              <div className="flex items-center justify-between mb-5">
                <h2 style={{ color: "#111827" }}>Notification Preferences</h2>
                {notificationSaved && <span style={{ color: "#10b981", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>✓ Saved</span>}
              </div>
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => {
                  const labels: Record<string, { title: string; desc: string }> = {
                    taskAssigned: { title: "Task Assigned", desc: "When a task is assigned to you" },
                    taskCompleted: { title: "Task Completed", desc: "When someone completes a task in your projects" },
                    mentions: { title: "Mentions", desc: "When someone mentions you in a comment" },
                    announcements: { title: "Announcements", desc: "Team announcements and updates" },
                    weeklyDigest: { title: "Weekly Digest", desc: "Weekly summary of team activity" },
                    deadlineReminders: { title: "Deadline Reminders", desc: "24-hour reminders for upcoming deadlines" },
                  };
                  return (
                    <div key={key} className="flex items-center justify-between py-3 border-b last:border-b-0" style={{ borderColor: "#f0f0ea" }}>
                      <div>
                        <p style={{ fontWeight: 500, color: "#111827", fontSize: "0.9375rem" }}>{labels[key].title}</p>
                        <p style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{labels[key].desc}</p>
                      </div>
                      <button onClick={() => {
                        const updated = { ...notifications, [key]: !notifications[key as keyof typeof notifications] };
                        setNotifications(updated);
                        localStorage.setItem("notifications", JSON.stringify(updated));
                        setNotificationSaved(true);
                        setTimeout(() => setNotificationSaved(false), 2500);
                      }}
                        className="relative w-11 h-6 rounded-full transition-colors"
                        style={{ background: value ? "#f59e0b" : "#e5e7eb" }}>
                        <div className="absolute top-0.5 rounded-full w-5 h-5 bg-white shadow transition-transform"
                          style={{ transform: value ? "translateX(1.25rem)" : "translateX(0.125rem)" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "#f0f0ea" }}>
              <h2 className="mb-5" style={{ color: "#111827" }}>Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Current Password</label>
                  <div className="relative">
                    <input type={showCurrentPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="••••••••" className="w-full px-4 py-2.5 pr-10 rounded-xl border outline-none" style={inputStyle} />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }}>
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>New Password</label>
                  <div className="relative">
                    <input type={showNewPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)}
                      placeholder="At least 6 characters" className="w-full px-4 py-2.5 pr-10 rounded-xl border outline-none" style={inputStyle} />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }}>
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Confirm New Password</label>
                  <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repeat new password" className="w-full px-4 py-2.5 rounded-xl border outline-none"
                    style={{ ...inputStyle, borderColor: confirmPw && confirmPw !== newPw ? "#ef4444" : "#e5e7eb" }} />
                </div>
                {pwError && <p style={{ color: "#ef4444", fontSize: "0.8125rem" }}>{pwError}</p>}
                {pwSaved && <p style={{ color: "#10b981", fontSize: "0.8125rem" }}>✓ Password changed successfully!</p>}
                <button onClick={handleChangePassword} disabled={pwSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors"
                  style={{ background: pwSaved ? "#10b981" : "#f59e0b", color: pwSaved ? "white" : "#111827", fontWeight: 600, fontSize: "0.875rem", opacity: pwSaving ? 0.7 : 1 }}>
                  {pwSaving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : pwSaved ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {pwSaving ? "Changing..." : pwSaved ? "Changed!" : "Update Password"}
                </button>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "#f0f0ea" }}>
              <h2 className="mb-5" style={{ color: "#111827" }}>Appearance</h2>
              <div>
                <p style={{ fontWeight: 500, color: "#111827", marginBottom: 12 }}>Color Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: "Amber", color: "#f59e0b", active: true },
                    { name: "Blue", color: "#3b82f6", active: false },
                    { name: "Purple", color: "#8b5cf6", active: false },
                    { name: "Green", color: "#10b981", active: false },
                    { name: "Rose", color: "#f43f5e", active: false },
                    { name: "Orange", color: "#f97316", active: false },
                  ].map((t) => (
                    <button key={t.name} className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                      style={{ borderColor: t.active ? t.color : "#e5e7eb", background: t.active ? `${t.color}15` : "transparent" }}>
                      <div className="w-5 h-5 rounded-full" style={{ background: t.color }} />
                      <span style={{ fontSize: "0.875rem", color: "#374151", fontWeight: t.active ? 600 : 400 }}>{t.name}</span>
                      {t.active && <span className="ml-auto text-xs" style={{ color: t.color }}>Active</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "workspace" && (
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "#f0f0ea" }}>
              <h2 className="mb-5" style={{ color: "#111827" }}>Workspace</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Current Team</label>
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#fafaf7" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                      style={{ background: currentTeam?.color || "#f59e0b", fontWeight: 700 }}>
                      {currentTeam?.name[0]}
                    </div>
                    <span style={{ fontWeight: 500, color: "#111827" }}>{currentTeam?.name}</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 8 }}>All Workspaces</p>
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "#f0f0ea" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                          style={{ background: team.color, fontWeight: 700 }}>
                          {team.name[0]}
                        </div>
                        <span style={{ flex: 1, color: "#374151", fontSize: "0.875rem" }}>{team.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          {team.ownerId === currentUser?.id ? "Owner" : "Member"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t" style={{ borderColor: "#f0f0ea" }}>
                <h3 className="mb-3" style={{ color: "#ef4444" }}>Danger Zone</h3>
                <div className="p-4 rounded-xl border" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
                  <p style={{ fontWeight: 500, color: "#374151", marginBottom: 4 }}>Delete Account</p>
                  <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: 12 }}>Once deleted, all data is permanently removed. This cannot be undone.</p>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors"
                    style={{ background: "#fef2f2", color: "#ef4444", fontWeight: 500, fontSize: "0.875rem", border: "1px solid #fecaca" }}>
                    <Trash2 className="w-4 h-4" />Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
