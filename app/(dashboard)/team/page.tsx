"use client";

import { useState } from "react";
import { useApp, UserRole, MemberStatus } from "@/context/AppContext";
import { Users, Mail, UserPlus, X, Trash2, Search, Circle } from "lucide-react";

const ROLE_COLORS: Record<UserRole, string> = { Owner: "#f59e0b", Admin: "#3b82f6", Member: "#22c55e" };
const STATUS_COLORS: Record<MemberStatus, string> = { Available: "#22c55e", Busy: "#ef4444", Away: "#f59e0b", Offline: "#6b7280" };
const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316", "#06b6d4"];
function getAvatarColor(name: string) { let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash); return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]; }

export default function TeamPage() {
  const { currentMembers, addMember, removeMember, updateMember, currentUser } = useApp();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("Member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const filteredMembers = currentMembers.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group by status for overview
  const statusCounts = {
    Available: currentMembers.filter(m => m.status === "Available").length,
    Busy: currentMembers.filter(m => m.status === "Busy").length,
    Away: currentMembers.filter(m => m.status === "Away").length,
    Offline: currentMembers.filter(m => m.status === "Offline").length,
  };

  const currentUserMember = currentMembers.find((m) => m.id === currentUser?.id || m.userId === currentUser?.id);
  const isOwnerOrAdmin = currentUserMember && currentUserMember.role !== "Member";

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setInviteLoading(true);
    setInviteError("");
    try {
      await addMember({
        name: inviteName,
        email: inviteEmail,
        avatar: inviteName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
        role: inviteRole,
        status: "Offline" as MemberStatus,
      });
      setShowInviteModal(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("Member");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Team</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{currentMembers.length} member{currentMembers.length !== 1 ? "s" : ""}</p>
        </div>
        {isOwnerOrAdmin && (
          <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium" style={{ background: "#f59e0b", color: "white" }}>
            <UserPlus className="w-4 h-4" /> Add Member
          </button>
        )}
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(Object.keys(STATUS_COLORS) as MemberStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            className="p-4 rounded-2xl border transition-all"
            style={{ 
              background: statusFilter === status ? `${STATUS_COLORS[status]}15` : "white", 
              borderColor: statusFilter === status ? STATUS_COLORS[status] : "#e5e7eb" 
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${STATUS_COLORS[status]}20` }}>
                <Circle className="w-5 h-5" fill={STATUS_COLORS[status]} style={{ color: STATUS_COLORS[status] }} />
              </div>
              <div className="text-left">
                <p style={{ color: "#6b7280", fontSize: "0.75rem" }}>{status}</p>
                <p style={{ color: "#111827", fontSize: "1.25rem", fontWeight: 700 }}>{statusCounts[status]}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
        <input type="text" placeholder="Search members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb", background: "white" }} />
      </div>

      {/* Member List */}
      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <div key={member.id} className="p-4 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb" }}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold" style={{ background: getAvatarColor(member.name) }}>
                  {member.avatar || member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white" style={{ background: STATUS_COLORS[member.status] }} title={member.status} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium" style={{ color: "#111827" }}>{member.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${ROLE_COLORS[member.role]}20`, color: ROLE_COLORS[member.role] }}>{member.role}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ background: `${STATUS_COLORS[member.status]}15`, color: STATUS_COLORS[member.status] }}>
                    <Circle className="w-2 h-2" fill="currentColor" />
                    {member.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1" style={{ color: "#6b7280" }}>
                  <Mail className="w-3 h-3" /> {member.email}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Status selector - users can change their own status, admins/owners can change anyone's */}
                {(member.userId === currentUser?.id || member.id === currentUser?.id || isOwnerOrAdmin) && (
                  <select 
                    value={member.status} 
                    onChange={(e) => updateMember(member.id, { status: e.target.value as MemberStatus })} 
                    className="px-3 py-1.5 rounded-lg border text-sm" 
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="Away">Away</option>
                    <option value="Offline">Offline</option>
                  </select>
                )}
                {isOwnerOrAdmin && member.id !== currentUser?.id && member.userId !== currentUser?.id && member.role !== "Owner" && (
                  <>
                    <select value={member.role} onChange={(e) => updateMember(member.id, { role: e.target.value as UserRole })} className="px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: "#e5e7eb" }}>
                      <option value="Member">Member</option>
                      <option value="Admin">Admin</option>
                    </select>
                    <button onClick={() => removeMember(member.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="text-center py-12"><Users className="w-12 h-12 mx-auto mb-4" style={{ color: "#d1d5db" }} /><p style={{ color: "#6b7280" }}>No members found</p></div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
              <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Add Member</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
            </div>
            <div className="p-6 space-y-4">
              {inviteError && <div className="p-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#ef4444" }}>{inviteError}</div>}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Name</label>
                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Email Address</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="colleague@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Cancel</button>
              <button onClick={handleInvite} disabled={inviteLoading || !inviteName.trim() || !inviteEmail.trim()} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b", opacity: inviteLoading || !inviteName.trim() || !inviteEmail.trim() ? 0.7 : 1 }}>{inviteLoading ? "Adding..." : "Add Member"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
