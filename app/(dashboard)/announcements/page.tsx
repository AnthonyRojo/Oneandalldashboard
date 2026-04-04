"use client";

import { useState } from "react";
import { useApp, AnnouncementType, Announcement } from "@/context/AppContext";
import { Plus, X, Megaphone, AlertTriangle, Info, Vote, Pin, Trash2 } from "lucide-react";

const TYPE_CONFIG: Record<AnnouncementType, { label: string; icon: typeof Megaphone; color: string }> = {
  general: { label: "General", icon: Megaphone, color: "#3b82f6" },
  urgent: { label: "Urgent", icon: AlertTriangle, color: "#ef4444" },
  update: { label: "Update", icon: Info, color: "#22c55e" },
  poll: { label: "Poll", icon: Vote, color: "#8b5cf6" },
};

export default function AnnouncementsPage() {
  const { currentUser, currentAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, voteOnPoll, currentMembers } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", type: "general" as AnnouncementType, isPinned: false, pollOptions: [] as { text: string }[] });
  const [newPollOption, setNewPollOption] = useState("");

  const sortedAnnouncements = [...currentAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) return;
    await createAnnouncement({ ...newAnnouncement, pollOptions: newAnnouncement.type === "poll" ? newAnnouncement.pollOptions : undefined });
    setShowCreateModal(false);
    setNewAnnouncement({ title: "", content: "", type: "general", isPinned: false, pollOptions: [] });
  };

  const handleVote = async (announcementId: string, optionId: string) => { await voteOnPoll(announcementId, optionId); };
  const addPollOption = () => { if (newPollOption.trim()) { setNewAnnouncement({ ...newAnnouncement, pollOptions: [...newAnnouncement.pollOptions, { text: newPollOption.trim() }] }); setNewPollOption(""); } };
  const removePollOption = (index: number) => { setNewAnnouncement({ ...newAnnouncement, pollOptions: newAnnouncement.pollOptions.filter((_, i) => i !== index) }); };

  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Announcements</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{currentAnnouncements.length} announcement{currentAnnouncements.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium" style={{ background: "#f59e0b", color: "white" }}><Plus className="w-4 h-4" /> New Announcement</button>
      </div>

      <div className="space-y-4">
        {sortedAnnouncements.map((announcement) => {
          const author = currentMembers.find((m) => m.id === announcement.authorId);
          const TypeIcon = TYPE_CONFIG[announcement.type].icon;
          const totalVotes = announcement.pollOptions?.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0) || 0;
          return (
            <div key={announcement.id} className="p-6 rounded-2xl border" style={{ background: "white", borderColor: announcement.isPinned ? "#f59e0b" : "#e5e7eb" }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TYPE_CONFIG[announcement.type].color}20` }}>
                  <TypeIcon className="w-5 h-5" style={{ color: TYPE_CONFIG[announcement.type].color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.isPinned && <Pin className="w-4 h-4" style={{ color: "#f59e0b" }} />}
                    <h3 className="font-semibold" style={{ color: "#111827" }}>{announcement.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${TYPE_CONFIG[announcement.type].color}20`, color: TYPE_CONFIG[announcement.type].color }}>{TYPE_CONFIG[announcement.type].label}</span>
                  </div>
                  <p className="mb-4" style={{ color: "#6b7280" }}>{announcement.content}</p>
                  {announcement.type === "poll" && announcement.pollOptions && (
                    <div className="space-y-2 mb-4">
                      {announcement.pollOptions.map((option) => {
                        const voteCount = option.votes?.length || 0;
                        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                        const hasVoted = option.votes?.includes(currentUser?.id || "");
                        return (
                          <button key={option.id} onClick={() => handleVote(announcement.id, option.id)} className="w-full text-left">
                            <div className="relative p-3 rounded-xl border" style={{ borderColor: hasVoted ? "#f59e0b" : "#e5e7eb" }}>
                              <div className="absolute inset-0 rounded-xl" style={{ background: "#f59e0b", opacity: 0.1, width: `${percentage}%` }} />
                              <div className="relative flex items-center justify-between">
                                <span style={{ color: "#374151" }}>{option.text}</span>
                                <span className="text-sm font-medium" style={{ color: "#6b7280" }}>{voteCount} vote{voteCount !== 1 ? "s" : ""} ({percentage.toFixed(0)}%)</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm" style={{ color: "#9ca3af" }}>
                      <span>{author?.name || "Unknown"}</span>
                      <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateAnnouncement(announcement.id, { isPinned: !announcement.isPinned })} className="p-2 rounded-lg hover:bg-gray-100"><Pin className="w-4 h-4" style={{ color: announcement.isPinned ? "#f59e0b" : "#9ca3af" }} /></button>
                      <button onClick={() => deleteAnnouncement(announcement.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {sortedAnnouncements.length === 0 && <div className="text-center py-12"><Megaphone className="w-12 h-12 mx-auto mb-4" style={{ color: "#d1d5db" }} /><p style={{ color: "#6b7280" }}>No announcements yet</p></div>}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
              <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Create Announcement</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Title</label><input type="text" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="Announcement title" /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Type</label><select value={newAnnouncement.type} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value as AnnouncementType })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}><option value="general">General</option><option value="urgent">Urgent</option><option value="update">Update</option><option value="poll">Poll</option></select></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Content</label><textarea value={newAnnouncement.content} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} className="w-full px-4 py-2 rounded-xl border resize-none" style={{ borderColor: "#e5e7eb" }} rows={4} placeholder="Announcement content" /></div>
              {newAnnouncement.type === "poll" && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Poll Options</label>
                  <div className="space-y-2 mb-2">{newAnnouncement.pollOptions.map((option, index) => (<div key={index} className="flex items-center gap-2"><span className="flex-1 px-3 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>{option.text}</span><button onClick={() => removePollOption(index)} className="p-2 rounded-lg hover:bg-red-50"><X className="w-4 h-4" style={{ color: "#ef4444" }} /></button></div>))}</div>
                  <div className="flex gap-2"><input type="text" value={newPollOption} onChange={(e) => setNewPollOption(e.target.value)} onKeyPress={(e) => e.key === "Enter" && addPollOption()} className="flex-1 px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="Add poll option" /><button onClick={addPollOption} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Add</button></div>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newAnnouncement.isPinned} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, isPinned: e.target.checked })} className="rounded" /><span className="text-sm" style={{ color: "#374151" }}>Pin this announcement</span></label>
            </div>
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Cancel</button>
              <button onClick={handleCreateAnnouncement} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b" }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
