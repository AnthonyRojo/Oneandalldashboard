"use client";

import { useState } from "react";
import { useApp, AnnouncementType, Announcement, PollOption } from "@/context/AppContext";
import { Plus, X, Megaphone, RefreshCw, HelpCircle, BarChart, Pin, Trash2, Heart, MessageSquare, Send } from "lucide-react";

const TYPE_CONFIG: Record<AnnouncementType, { label: string; icon: typeof Megaphone; color: string }> = {
  update: { label: "Update", icon: RefreshCw, color: "#22c55e" },
  poll: { label: "Poll", icon: BarChart, color: "#8b5cf6" },
  question: { label: "Question", icon: HelpCircle, color: "#3b82f6" },
};

export default function AnnouncementsPage() {
  const { currentUser, currentAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement, toggleLike, togglePin, voteOnPoll, addAnnouncementComment, currentMembers, currentProjects } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ content: "", type: "update" as AnnouncementType, attachedProject: "", pollOptions: [] as PollOption[] });
  const [newPollOption, setNewPollOption] = useState("");
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const sortedAnnouncements = [...currentAnnouncements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.content.trim()) return;
    await addAnnouncement(
      newAnnouncement.content,
      newAnnouncement.type,
      newAnnouncement.attachedProject || undefined,
      newAnnouncement.type === "poll" ? newAnnouncement.pollOptions : undefined
    );
    setShowCreateModal(false);
    setNewAnnouncement({ content: "", type: "update", attachedProject: "", pollOptions: [] });
  };

  const handleVote = async (announcementId: string, optionId: string) => {
    await voteOnPoll(announcementId, optionId);
  };

  const addPollOption = () => {
    if (newPollOption.trim()) {
      const newOption: PollOption = { id: `opt_${Date.now()}`, text: newPollOption.trim() };
      setNewAnnouncement({ ...newAnnouncement, pollOptions: [...newAnnouncement.pollOptions, newOption] });
      setNewPollOption("");
    }
  };

  const removePollOption = (index: number) => {
    setNewAnnouncement({ ...newAnnouncement, pollOptions: newAnnouncement.pollOptions.filter((_, i) => i !== index) });
  };

  const handleAddComment = async (announcementId: string) => {
    if (!newComment.trim()) return;
    await addAnnouncementComment(announcementId, newComment);
    setNewComment("");
  };

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
          const totalVotes = announcement.pollVotes ? Object.keys(announcement.pollVotes).length : 0;
          const hasLiked = currentUser && announcement.likes.includes(currentUser.id);
          const showComments = expandedComments === announcement.id;

          return (
            <div key={announcement.id} className="p-6 rounded-2xl border" style={{ background: "white", borderColor: announcement.pinned ? "#f59e0b" : "#e5e7eb" }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TYPE_CONFIG[announcement.type].color}20` }}>
                  <TypeIcon className="w-5 h-5" style={{ color: TYPE_CONFIG[announcement.type].color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.pinned && <Pin className="w-4 h-4" style={{ color: "#f59e0b" }} />}
                    <span className="font-medium" style={{ color: "#111827" }}>{author?.name || announcement.authorName || "Unknown"}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${TYPE_CONFIG[announcement.type].color}20`, color: TYPE_CONFIG[announcement.type].color }}>{TYPE_CONFIG[announcement.type].label}</span>
                    <span className="text-xs" style={{ color: "#9ca3af" }}>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mb-4" style={{ color: "#374151" }}>{announcement.content}</p>

                  {/* Poll Options */}
                  {announcement.type === "poll" && announcement.pollOptions && (
                    <div className="space-y-2 mb-4">
                      {announcement.pollOptions.map((option) => {
                        const voteCount = announcement.pollVotes ? Object.values(announcement.pollVotes).filter(v => v === option.id).length : 0;
                        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                        const hasVoted = currentUser && announcement.pollVotes?.[currentUser.id] === option.id;
                        return (
                          <button key={option.id} onClick={() => handleVote(announcement.id, option.id)} className="w-full text-left">
                            <div className="relative p-3 rounded-xl border overflow-hidden" style={{ borderColor: hasVoted ? "#f59e0b" : "#e5e7eb" }}>
                              <div className="absolute inset-y-0 left-0 rounded-xl" style={{ background: "#f59e0b", opacity: 0.15, width: `${percentage}%` }} />
                              <div className="relative flex items-center justify-between">
                                <span style={{ color: "#374151" }}>{option.text}</span>
                                <span className="text-sm font-medium" style={{ color: "#6b7280" }}>{voteCount} ({percentage.toFixed(0)}%)</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleLike(announcement.id)} className="flex items-center gap-1 text-sm" style={{ color: hasLiked ? "#ef4444" : "#6b7280" }}>
                        <Heart className="w-4 h-4" fill={hasLiked ? "#ef4444" : "none"} /> {announcement.likes.length}
                      </button>
                      <button onClick={() => setExpandedComments(showComments ? null : announcement.id)} className="flex items-center gap-1 text-sm" style={{ color: "#6b7280" }}>
                        <MessageSquare className="w-4 h-4" /> {announcement.comments.length}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePin(announcement.id)} className="p-2 rounded-lg hover:bg-gray-100"><Pin className="w-4 h-4" style={{ color: announcement.pinned ? "#f59e0b" : "#9ca3af" }} /></button>
                      {currentUser?.id === announcement.authorId && (
                        <button onClick={() => deleteAnnouncement(announcement.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
                      )}
                    </div>
                  </div>

                  {/* Comments */}
                  {showComments && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: "#e5e7eb" }}>
                      <div className="space-y-3 mb-4">
                        {announcement.comments.map((comment) => (
                          <div key={comment.id} className="p-3 rounded-lg" style={{ background: "#f9fafb" }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm" style={{ color: "#111827" }}>{comment.authorName}</span>
                              <span className="text-xs" style={{ color: "#9ca3af" }}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm" style={{ color: "#6b7280" }}>{comment.content}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddComment(announcement.id)}
                          className="flex-1 px-4 py-2 rounded-xl border"
                          style={{ borderColor: "#e5e7eb" }}
                          placeholder="Add a comment..."
                        />
                        <button onClick={() => handleAddComment(announcement.id)} className="p-2 rounded-xl" style={{ background: "#f59e0b", color: "white" }}>
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
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
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Type</label>
                <select value={newAnnouncement.type} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value as AnnouncementType })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                  <option value="update">Update</option>
                  <option value="question">Question</option>
                  <option value="poll">Poll</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Content</label>
                <textarea value={newAnnouncement.content} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} className="w-full px-4 py-2 rounded-xl border resize-none" style={{ borderColor: "#e5e7eb" }} rows={4} placeholder="What would you like to share?" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Attach Project (optional)</label>
                <select value={newAnnouncement.attachedProject} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, attachedProject: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                  <option value="">None</option>
                  {currentProjects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              {newAnnouncement.type === "poll" && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Poll Options</label>
                  <div className="space-y-2 mb-2">
                    {newAnnouncement.pollOptions.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <span className="flex-1 px-3 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>{option.text}</span>
                        <button onClick={() => removePollOption(index)} className="p-2 rounded-lg hover:bg-red-50"><X className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newPollOption} onChange={(e) => setNewPollOption(e.target.value)} onKeyPress={(e) => e.key === "Enter" && addPollOption()} className="flex-1 px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="Add poll option" />
                    <button onClick={addPollOption} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Add</button>
                  </div>
                </div>
              )}
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
