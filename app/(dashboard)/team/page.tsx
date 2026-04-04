"use client";

import { useState } from "react";
import { useApp, UserRole } from "@/context/AppContext";
import { Users, Mail, Shield, UserPlus, X, Trash2, Search } from "lucide-react";

const ROLE_COLORS: Record<UserRole, string> = { owner: "#f59e0b", admin: "#3b82f6", member: "#22c55e" };
const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316", "#06b6d4"];
function getAvatarColor(name: string) { let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash); return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]; }

export default function TeamPage() {
  const { currentMembers, inviteMember, removeMember, updateMemberRole, currentUser } = useApp();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const filteredMembers = currentMembers.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()));
  const isOwnerOrAdmin = currentUser && currentMembers.find((m) => m.id === currentUser.id)?.role !== "member";

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError("");
    try {
      await inviteMember(inviteEmail, inviteRole);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Team</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{currentMembers.length} member{currentMembers.length !== 1 ? "s" : ""}</p>
        </div>
        {isOwnerOrAdmin && (
          <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium" style={{ background: "#f59e0b", color: "white" }}>
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
        <input type="text" placeholder="Search members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb", background: "white" }} />
      </div>

      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <div key={member.id} className="p-4 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold" style={{ background: getAvatarColor(member.name) }}>
                {member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium" style={{ color: "#111827" }}>{member.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ background: `${ROLE_COLORS[member.role]}20`, color: ROLE_COLORS[member.role] }}>{member.role}</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: "#6b7280" }}>
                  <Mail className="w-3 h-3" /> {member.email}
                </div>
              </div>
              {isOwnerOrAdmin && member.id !== currentUser?.id && member.role !== "owner" && (
                <div className="flex items-center gap-2">
                  <select value={member.role} onChange={(e) => updateMemberRole(member.id, e.target.value as UserRole)} className="px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: "#e5e7eb" }}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => removeMember(member.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="text-center py-12"><Users className="w-12 h-12 mx-auto mb-4" style={{ color: "#d1d5db" }} /><p style={{ color: "#6b7280" }}>No members found</p></div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
              <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Invite Member</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
            </div>
            <div className="p-6 space-y-4">
              {inviteError && <div className="p-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#ef4444" }}>{inviteError}</div>}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Email Address</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="colleague@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Cancel</button>
              <button onClick={handleInvite} disabled={inviteLoading} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b" }}>{inviteLoading ? "Inviting..." : "Send Invite"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
