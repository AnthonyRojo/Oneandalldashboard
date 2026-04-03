import { useState } from "react";
import { useApp, AnnouncementType, Announcement } from "../context/AppContext";
import { Pin, Heart, MessageSquare, ChevronDown, ChevronUp, Plus, Paperclip, Tag, Send, Megaphone, MoreHorizontal } from "lucide-react";

const AVATAR_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_CONFIG: Record<AnnouncementType, { color: string; bg: string; label: string }> = {
  update: { color: "#3b82f6", bg: "#eff6ff", label: "Update" },
  poll: { color: "#8b5cf6", bg: "#f5f3ff", label: "Poll" },
  question: { color: "#f59e0b", bg: "#fffbeb", label: "Question" },
};

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const { toggleLike, togglePin, addAnnouncementComment, currentUser, currentProjects } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const isLiked = currentUser ? announcement.likes.includes(currentUser.id) : false;
  const typeConf = TYPE_CONFIG[announcement.type];
  const attachedProject = currentProjects.find((p) => p.id === announcement.attachedProject);

  const handleComment = () => {
    if (commentText.trim()) {
      addAnnouncementComment(announcement.id, commentText);
      setCommentText("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden transition-all"
      style={{ borderColor: announcement.pinned ? "#fde68a" : "#f0f0ea", boxShadow: announcement.pinned ? "0 0 0 1px #fde68a" : "none" }}>
      {announcement.pinned && (
        <div className="flex items-center gap-2 px-5 py-2.5 border-b" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
          <Pin className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#92400e" }}>Pinned Announcement</span>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ background: getAvatarColor(announcement.authorName), fontWeight: 700, fontSize: "0.875rem" }}>
            {announcement.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.9375rem" }}>{announcement.authorName}</span>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: typeConf.bg, color: typeConf.color, fontWeight: 500 }}>
                {typeConf.label}
              </span>
              {attachedProject && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                  <Tag className="w-2.5 h-2.5" />{attachedProject.name}
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>{timeAgo(announcement.createdAt)}</p>
          </div>
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg transition-colors" style={{ color: "#9ca3af" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl border bg-white shadow-lg z-10 p-1" style={{ borderColor: "#f0f0ea" }}>
                <button onClick={() => { togglePin(announcement.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors text-sm"
                  style={{ color: "#374151" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f6"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  {announcement.pinned ? "Unpin" : "Pin to top"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <p style={{ color: "#374151", lineHeight: 1.7, fontSize: "0.9375rem" }}>{announcement.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: "#f0f0ea" }}>
          <button onClick={() => toggleLike(announcement.id)}
            className="flex items-center gap-1.5 transition-colors"
            style={{ color: isLiked ? "#ef4444" : "#9ca3af" }}>
            <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
            <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{announcement.likes.length}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 transition-colors"
            style={{ color: "#9ca3af" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#374151"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#9ca3af"}>
            <MessageSquare className="w-4 h-4" />
            <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{announcement.comments.length}</span>
            {showComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 space-y-3">
            {announcement.comments.length === 0 ? (
              <p style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>No replies yet. Start the conversation!</p>
            ) : announcement.comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                  style={{ background: getAvatarColor(c.authorName), fontWeight: 700 }}>
                  {c.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 rounded-xl p-3" style={{ background: "#fafaf7" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>
                    {c.authorName}
                    <span className="ml-2 font-normal" style={{ color: "#9ca3af" }}>{timeAgo(c.createdAt)}</span>
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "#374151", marginTop: 2 }}>{c.content}</p>
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
                <button onClick={handleComment} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
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

export default function AnnouncementsPage() {
  const { currentAnnouncements, addAnnouncement, currentProjects } = useApp();
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<AnnouncementType>("update");
  const [attachedProject, setAttachedProject] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const handlePost = () => {
    if (!postContent.trim()) return;
    addAnnouncement(postContent, postType, attachedProject || undefined);
    setPostContent("");
    setAttachedProject("");
    setPostType("update");
  };

  const sortedAnnouncements = [...currentAnnouncements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#fffbeb" }}>
          <Megaphone className="w-5 h-5" style={{ color: "#f59e0b" }} />
        </div>
        <div>
          <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>Announcements</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Team updates, questions, and discussions</p>
        </div>
      </div>

      {/* Post Composer */}
      <div className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: "#f0f0ea" }}>
        <h3 className="mb-3" style={{ color: "#111827" }}>Post to the team</h3>

        {/* Type selector */}
        <div className="flex gap-2 mb-3">
          {(["update", "question", "poll"] as AnnouncementType[]).map((t) => {
            const conf = TYPE_CONFIG[t];
            return (
              <button key={t} onClick={() => setPostType(t)}
                className="px-3 py-1.5 rounded-xl text-xs transition-all capitalize"
                style={{
                  background: postType === t ? conf.bg : "#f3f4f6",
                  color: postType === t ? conf.color : "#6b7280",
                  fontWeight: postType === t ? 600 : 400,
                  border: `1.5px solid ${postType === t ? conf.color : "transparent"}`,
                }}>
                {conf.label}
              </button>
            );
          })}
        </div>

        <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={4}
          placeholder="Share an update, ask a question, or start a discussion with your team..."
          className="w-full px-4 py-3 rounded-xl border outline-none resize-none mb-3"
          style={{ borderColor: "#e5e7eb", fontSize: "0.9375rem", lineHeight: 1.6 }} />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors" style={{ color: "#6b7280", fontSize: "0.8125rem" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <Paperclip className="w-3.5 h-3.5" />Attach
            </button>
            <div className="relative">
              <button onClick={() => setShowProjectPicker(!showProjectPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: attachedProject ? "#f59e0b" : "#6b7280", fontSize: "0.8125rem", background: attachedProject ? "#fffbeb" : "transparent" }}
                onMouseEnter={(e) => { if (!attachedProject) e.currentTarget.style.background = "#f3f4f6"; }}
                onMouseLeave={(e) => { if (!attachedProject) e.currentTarget.style.background = "transparent"; }}>
                <Tag className="w-3.5 h-3.5" />
                {attachedProject ? currentProjects.find((p) => p.id === attachedProject)?.name : "Tag Project"}
              </button>
              {showProjectPicker && (
                <div className="absolute left-0 mt-1 w-48 rounded-xl border bg-white shadow-lg z-10 p-1" style={{ borderColor: "#f0f0ea" }}>
                  <button onClick={() => { setAttachedProject(""); setShowProjectPicker(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm" style={{ color: "#6b7280" }}>None</button>
                  {currentProjects.map((p) => (
                    <button key={p.id} onClick={() => { setAttachedProject(p.id); setShowProjectPicker(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
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
            className="flex items-center gap-2 px-5 py-2 rounded-xl transition-all"
            style={{
              background: postContent.trim() ? "#f59e0b" : "#e5e7eb",
              color: postContent.trim() ? "#111827" : "#9ca3af",
              fontWeight: 600, fontSize: "0.875rem",
            }}>
            <Plus className="w-4 h-4" /> Post
          </button>
        </div>
      </div>

      {/* Feed */}
      {sortedAnnouncements.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: "#f0f0ea" }}>
          <Megaphone className="w-12 h-12 mx-auto mb-4" style={{ color: "#d1d5db" }} />
          <h3 style={{ color: "#111827", marginBottom: 8 }}>No announcements yet</h3>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Be the first to post an update for your team!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAnnouncements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </div>
      )}
    </div>
  );
}
