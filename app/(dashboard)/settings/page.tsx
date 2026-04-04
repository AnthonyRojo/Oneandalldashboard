"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { User, Bell, Lock, Save, Eye, EyeOff, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState("profile");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState({ email: true, push: true, tasks: true, announcements: true });

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setEmail(currentUser.email || "");
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: email !== currentUser?.email ? email : undefined,
        data: { name },
      });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Lock },
  ];

  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Settings</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Manage your account preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-48 flex-shrink-0">
          <div className="flex md:flex-col gap-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors" style={{ background: activeTab === tab.id ? "#f59e0b" : "transparent", color: activeTab === tab.id ? "white" : "#374151" }}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="p-6 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
            {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#ef4444" }}>{error}</div>}
            {success && <div className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: "#f0fdf4", color: "#22c55e" }}><Check className="w-4 h-4" /> Changes saved successfully</div>}

            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Profile Information</h2>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
                </div>
                <button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b", opacity: saving ? 0.7 : 1 }}>
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Notification Preferences</h2>
                {[
                  { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
                  { key: "push", label: "Push Notifications", desc: "Receive browser notifications" },
                  { key: "tasks", label: "Task Updates", desc: "Get notified about task changes" },
                  { key: "announcements", label: "Announcements", desc: "Get notified about new announcements" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#f9fafb" }}>
                    <div><p className="font-medium" style={{ color: "#111827" }}>{item.label}</p><p className="text-sm" style={{ color: "#6b7280" }}>{item.desc}</p></div>
                    <button onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })} className="w-10 h-6 rounded-full p-0.5 transition-colors" style={{ background: notifications[item.key as keyof typeof notifications] ? "#f59e0b" : "#d1d5db" }}>
                      <div className="w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: notifications[item.key as keyof typeof notifications] ? "translateX(16px)" : "translateX(0)" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Change Password</h2>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Current Password</label>
                  <div className="relative">
                    <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-2 pr-10 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showCurrentPassword ? <EyeOff className="w-4 h-4" style={{ color: "#9ca3af" }} /> : <Eye className="w-4 h-4" style={{ color: "#9ca3af" }} />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>New Password</label>
                  <div className="relative">
                    <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 pr-10 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showNewPassword ? <EyeOff className="w-4 h-4" style={{ color: "#9ca3af" }} /> : <Eye className="w-4 h-4" style={{ color: "#9ca3af" }} />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
                </div>
                <button onClick={handleChangePassword} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b", opacity: saving ? 0.7 : 1 }}>
                  <Lock className="w-4 h-4" /> {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
