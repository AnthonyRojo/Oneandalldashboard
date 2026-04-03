import { useState } from "react";
import { useApp, AnnouncementType, Announcement, PollOption } from "../context/AppContext";
import {
  Pin, Heart, MessageSquare, ChevronDown, ChevronUp, Plus, Paperclip,
  Tag, Send, Megaphone, MoreHorizontal, Filter, Pencil, Trash2, X, Check,
  BarChart2,
} from "lucide-react";

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316"];
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

const TYPE_CONFIG: Record<AnnouncementType, { color: string; bg: string; label: string }> = {
  update:   { color: "#1d4ed8", bg: "#dbeafe", label: "Update" },
  poll:     { color: "#6d28d9", bg: "#ede9fe", label: "Poll" },
  question: { color: "#d97706", bg: "#fef3c7", label: "Question" },
};

type FilterType = "all" | AnnouncementType | "pinned";

// ── Poll Component ─────────────────────────────────────────────────────────────
function PollBlock({ announcement }: { announcement: Announcement }) {
  const { voteOnPoll, currentUser } = useApp();
  const options = announcement.pollOptions || [];
  const votes = announcement.pollVotes || {};
  const totalVotes = Object.keys(votes).length;
  const myVote = currentUser ? votes[currentUser.id] : null;

  if (options.length === 0) return null;

  return (
    <div className="mt-3 space-y-2" role="radiogroup" aria-label="Poll options">
      {options.map((opt) => {
        const voteCount = Object.values(votes).filter((v) => v === opt.id).length;
        const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const isMyVote = myVote === opt.id;
        const voted = !!myVote;

        return (
          <button key={opt.id}
            onClick={() => !voted && voteOnPoll(announcement.id, opt.id)}
            disabled={voted}
            role="radio"
            aria-checked={isMyVote}
            className="w-full text-left rounded-xl overflow-hidden relative transition-all"
            style={{
              border: `2px solid ${isMyVote ? "#7c3aed" : "#e5e7eb"}`,
              background: "white",
              cursor: voted ? "default" : "pointer",
            }}>
            {/* Progress fill */}
            {voted && (
              <div className="absolute inset-0 rounded-xl"
                style={{ width: `${pct}%`, background: isMyVote ? "#ede9fe" : "#f9f9f6", transition: "width 0.5s ease" }} />
            )}
            <div className="relative flex items-center justify-between px-4 py-2.5 gap-3">
              <span style={{ fontSize: "0.875rem", fontWeight: isMyVote ? 600 : 400, color: isMyVote ? "#5b21b6" : "#374151" }}>
                {isMyVote && <Check className="w-3.5 h-3.5 inline mr-1.5" />}
                {opt.text}
              </span>
              {voted && (
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: isMyVote ? "#6d28d9" : "#9ca3af", flexShrink: 0 }}>
                  {pct}% ({voteCount})
                </span>
              )}
            </div>
          </button>
        );
      })}
      <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}{myVote ? " · You voted" : " · Click to vote"}
      </p>
    </div>
  );
}

// ── Announcement Card ──────────────────────────────────────────────────────────
function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const {
    toggleLike, togglePin, addAnnouncementComment,
    updateAnnouncement, deleteAnnouncement,
    updateAnnouncementComment, deleteAnnouncementComment,
    currentUser, currentProjects,
  } = useApp();

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState(announcement.content);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const isLiked = currentUser ? announcement.likes.includes(currentUser.id) : false;
  const isAuthor = currentUser?.id === announcement.authorId;
  const typeConf = TYPE_CONFIG[announcement.type];
  const attachedProject = currentProjects.find((p) => p.id === announcement.attachedProject);

  const handleComment = () => {
    if (commentText.trim()) { addAnnouncementComment(announcement.id, commentText); setCommentText(""); }
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden"
      style={{ borderColor: announcement.pinned ? "#fde68a" : "#f0f0ea", boxShadow: announcement.pinned ? "0 0 0 2px #fde68a" : "none" }}>
      {announcement.pinned && (
        <div className="flex items-center gap-2 px-5 py-2" style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a" }}>
          <Pin className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} aria-hidden />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#92400e" }}>Pinned</span>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ background: getAvatarColor(announcement.authorName), fontWeight: 700, fontSize: "0.875rem" }}
            aria-label={announcement.authorName}>
            {announcement.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontWeight: 600, color: "#111827" }}>{announcement.authorName}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: typeConf.bg, color: typeConf.color }}>{typeConf.label}</span>
              {attachedProject && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                  style={{ background: "#f3f4f6", color: "#6b7280" }}>
                  <Tag className="w-2.5 h-2.5" aria-hidden />{attachedProject.name}
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>
              {timeAgo(announcement.createdAt)}{announcement.editedAt && " (edited)"}
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg" style={{ color: "#9ca3af" }}
              aria-label="More options" aria-expanded={showMenu}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 rounded-xl border bg-white shadow-lg z-10 p-1" style={{ borderColor: "#f0f0ea" }}>
                <button onClick={() => { togglePin(announcement.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                  style={{ color: "#374151" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f6"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <Pin className="w-3.5 h-3.5" />{announcement.pinned ? "Unpin" : "Pin to top"}
                </button>
                {isAuthor && (
                  <>
                    <button onClick={() => { setEditingPost(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                      style={{ color: "#374151" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f6"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <Pencil className="w-3.5 h-3.5" />Edit
                    </button>
                    <button onClick={() => { if (confirm("Delete?")) deleteAnnouncement(announcement.id); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                      style={{ color: "#ef4444" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <Trash2 className="w-3.5 h-3.5" />Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {editingPost ? (
          <div className="mb-3">
            <textarea value={editPostContent} onChange={(e) => setEditPostContent(e.target.value)} rows={4}
              className="w-full px-4 py-3 rounded-xl border outline-none resize-none"
              style={{ borderColor: "#f59e0b", fontSize: "0.9375rem" }} />
            <div className="flex gap-2 mt-2">
              <button onClick={() => { updateAnnouncement(announcement.id, editPostContent); setEditingPost(false); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
                style={{ background: "#f59e0b", color: "#111827", fontWeight: 600 }}>
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => { setEditingPost(false); setEditPostContent(announcement.content); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{announcement.content}</p>
        )}

        {/* Poll */}
        {announcement.type === "poll" && <PollBlock announcement={announcement} />}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: "#f0f0ea" }}>
          <button onClick={() => toggleLike(announcement.id)}
            className="flex items-center gap-1.5 transition-colors"
            style={{ color: isLiked ? "#ef4444" : "#9ca3af" }}
            aria-label={isLiked ? "Unlike" : "Like"} aria-pressed={isLiked}>
            <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
            <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{announcement.likes.length}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 transition-colors"
            style={{ color: showComments ? "#374151" : "#9ca3af" }}
            aria-expanded={showComments} aria-label="Toggle comments">
            <MessageSquare className="w-4 h-4" />
            <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{announcement.comments.length}</span>
            {showComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 space-y-3">
            {announcement.comments.length === 0 ? (
              <p style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>No replies yet.</p>
            ) : announcement.comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                  style={{ background: getAvatarColor(c.authorName), fontWeight: 700 }}>
                  {c.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 rounded-xl p-3" style={{ background: "#fafaf7" }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>
                      {c.authorName}
                      <span className="ml-2 font-normal" style={{ color: "#9ca3af" }}>{timeAgo(c.createdAt)}{c.editedAt && " (edited)"}</span>
                    </p>
                    {currentUser?.id === c.authorId && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.content); }}
                          style={{ color: "#9ca3af" }} aria-label="Edit comment"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => deleteAnnouncementComment(announcement.id, c.id)}
                          style={{ color: "#ef4444" }} aria-label="Delete comment"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === c.id ? (
                    <div className="flex gap-2 mt-1">
                      <input value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)}
                        className="flex-1 px-2 py-1 rounded-lg border outline-none" style={{ fontSize: "0.8125rem", borderColor: "#e5e7eb" }} />
                      <button onClick={() => { updateAnnouncementComment(announcement.id, c.id, editingCommentText); setEditingCommentId(null); }}
                        style={{ color: "#10b981" }}><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingCommentId(null)} style={{ color: "#9ca3af" }}><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.8125rem", color: "#374151", whiteSpace: "pre-wrap" }}>{c.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                style={{ background: getAvatarColor(currentUser?.name || "A"), fontWeight: 700 }}>
                {currentUser?.avatar?.slice(0, 2) || "A"}
              </div>
              <div className="flex-1 flex gap-2">
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  placeholder="Write a reply..."
                  className="flex-1 px-4 py-2 rounded-xl border outline-none"
                  style={{ borderColor: "#e5e7eb", fontSize: "0.8125rem" }} />
                <button onClick={handleComment} className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "#f59e0b" }}>
                  <Send className="w-3.5 h-3.5" style={{ color: "#111827" }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const { currentAnnouncements, addAnnouncement, currentProjects } = useApp();
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<AnnouncementType>("update");
  const [attachedProject, setAttachedProject] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showFilter, setShowFilter] = useState(false);

  // Poll composer
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: "opt1", text: "" },
    { id: "opt2", text: "" },
  ]);

  const addPollOption = () => {
    setPollOptions([...pollOptions, { id: `opt${Date.now()}`, text: "" }]);
  };
  const updatePollOption = (id: string, text: string) => {
    setPollOptions(pollOptions.map((o) => (o.id === id ? { ...o, text } : o)));
  };
  const removePollOption = (id: string) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((o) => o.id !== id));
  };

  const handlePost = () => {
    if (!postContent.trim()) return;
    const validPollOptions = postType === "poll" ? pollOptions.filter((o) => o.text.trim()) : undefined;
    if (postType === "poll" && (!validPollOptions || validPollOptions.length < 2)) {
      alert("Please add at least 2 poll options.");
      return;
    }
    addAnnouncement(postContent, postType, attachedProject || undefined, validPollOptions);
    setPostContent("");
    setAttachedProject("");
    setPostType("update");
    setPollOptions([{ id: "opt1", text: "" }, { id: "opt2", text: "" }]);
  };

  const filtered = [...currentAnnouncements]
    .filter((a) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "pinned") return a.pinned;
      return a.type === activeFilter;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const filterLabels: Record<FilterType, string> = {
    all: "All Posts", pinned: "📌 Pinned",
    update: "Updates", question: "Questions", poll: "Polls",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#fffbeb" }}>
            <Megaphone className="w-5 h-5" style={{ color: "#f59e0b" }} aria-hidden />
          </div>
          <div>
            <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>Announcements</h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{currentAnnouncements.length} posts</p>
          </div>
        </div>

        <div className="relative">
          <button onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border"
            style={{ borderColor: activeFilter !== "all" ? "#f59e0b" : "#e5e5e0", background: activeFilter !== "all" ? "#fffbeb" : "white", color: activeFilter !== "all" ? "#f59e0b" : "#374151", fontSize: "0.875rem" }}
            aria-expanded={showFilter}>
            <Filter className="w-4 h-4" />{filterLabels[activeFilter]}<ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showFilter && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border bg-white shadow-lg z-20 p-2" style={{ borderColor: "#f0f0ea" }}>
              {(["all", "pinned", "update", "question", "poll"] as FilterType[]).map((f) => (
                <button key={f} onClick={() => { setActiveFilter(f); setShowFilter(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: activeFilter === f ? "#f59e0b" : "#374151", background: activeFilter === f ? "#fffbeb" : "transparent", fontWeight: activeFilter === f ? 600 : 400 }}>
                  {filterLabels[f]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Post Composer */}
      <div className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: "#f0f0ea" }}>
        <h3 className="mb-3" style={{ color: "#111827" }}>Post to the team</h3>
        <div className="flex gap-2 mb-3" role="group" aria-label="Post type">
          {(["update", "question", "poll"] as AnnouncementType[]).map((t) => {
            const conf = TYPE_CONFIG[t];
            const Icon = t === "poll" ? BarChart2 : t === "question" ? MessageSquare : Megaphone;
            return (
              <button key={t} onClick={() => setPostType(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{ background: postType === t ? conf.bg : "#f3f4f6", color: postType === t ? conf.color : "#6b7280", fontWeight: postType === t ? 600 : 400, border: `1.5px solid ${postType === t ? conf.color : "transparent"}` }}
                aria-pressed={postType === t}>
                <Icon className="w-3 h-3" />{conf.label}
              </button>
            );
          })}
        </div>

        <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={3}
          placeholder={postType === "poll" ? "Ask your poll question..." : postType === "question" ? "Ask the team a question..." : "Share an update..."}
          className="w-full px-4 py-3 rounded-xl border outline-none resize-none mb-3"
          style={{ borderColor: "#e5e7eb", fontSize: "0.9375rem", lineHeight: 1.6 }} />

        {/* Poll Options */}
        {postType === "poll" && (
          <div className="mb-4 space-y-2">
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>Poll Options</p>
            {pollOptions.map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span style={{ fontSize: "0.75rem", color: "#9ca3af", minWidth: 20, fontWeight: 600 }}>{idx + 1}.</span>
                <input value={opt.text} onChange={(e) => updatePollOption(opt.id, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 px-3 py-2 rounded-xl border outline-none"
                  style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }}
                  aria-label={`Poll option ${idx + 1}`} />
                {pollOptions.length > 2 && (
                  <button onClick={() => removePollOption(opt.id)} style={{ color: "#ef4444" }} aria-label="Remove option">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addPollOption}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
              style={{ color: "#6d28d9", background: "#ede9fe" }}>
              <Plus className="w-3.5 h-3.5" /> Add option
            </button>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ color: "#6b7280" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <Paperclip className="w-3.5 h-3.5" />Attach
            </button>
            <div className="relative">
              <button onClick={() => setShowProjectPicker(!showProjectPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
                style={{ color: attachedProject ? "#f59e0b" : "#6b7280", background: attachedProject ? "#fffbeb" : "transparent" }}>
                <Tag className="w-3.5 h-3.5" />
                {attachedProject ? currentProjects.find((p) => p.id === attachedProject)?.name : "Tag Project"}
              </button>
              {showProjectPicker && (
                <div className="absolute left-0 mt-1 w-48 rounded-xl border bg-white shadow-lg z-10 p-1" style={{ borderColor: "#f0f0ea" }}>
                  <button onClick={() => { setAttachedProject(""); setShowProjectPicker(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm" style={{ color: "#6b7280" }}>None</button>
                  {currentProjects.map((p) => (
                    <button key={p.id} onClick={() => { setAttachedProject(p.id); setShowProjectPicker(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm"
                      style={{ color: attachedProject === p.id ? "#f59e0b" : "#374151" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f6"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={handlePost} disabled={!postContent.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl"
            style={{ background: postContent.trim() ? "#f59e0b" : "#e5e7eb", color: postContent.trim() ? "#111827" : "#9ca3af", fontWeight: 600, fontSize: "0.875rem" }}>
            <Plus className="w-4 h-4" /> Post
          </button>
        </div>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: "#f0f0ea" }}>
          <Megaphone className="w-12 h-12 mx-auto mb-4" style={{ color: "#d1d5db" }} />
          <h3 style={{ color: "#111827", marginBottom: 8 }}>
            {activeFilter === "all" ? "No announcements yet" : `No ${filterLabels[activeFilter].toLowerCase()}`}
          </h3>
          {activeFilter !== "all" && (
            <button onClick={() => setActiveFilter("all")} className="mt-4 px-4 py-2 rounded-xl text-sm"
              style={{ background: "#fffbeb", color: "#f59e0b", fontWeight: 500 }}>
              Show all posts
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
        </div>
      )}
    </div>
  );
}
