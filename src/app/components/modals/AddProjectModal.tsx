import { useState } from "react";
import { X } from "lucide-react";
import { useApp } from "../../context/AppContext";

interface Props { onClose: () => void; }

const PROJECT_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f97316", "#06b6d4", "#ef4444"];

export default function AddProjectModal({ onClose }: Props) {
  const { addProject } = useApp();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addProject({ name, description, dueDate, color, status: "active", progress: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: "#111827" }}>New Project</h2>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: "#9ca3af" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Project Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q4 Campaign"
              className="w-full px-4 py-2.5 rounded-xl border outline-none"
              style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} required />
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="What is this project about?"
              className="w-full px-4 py-2.5 rounded-xl border outline-none resize-none"
              style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border outline-none"
              style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
          </div>
          <div>
            <label className="block mb-2" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform"
                  style={{
                    background: c,
                    transform: color === c ? "scale(1.2)" : "scale(1)",
                    outline: color === c ? `3px solid ${c}` : "none",
                    outlineOffset: 2,
                  }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border transition-colors"
              style={{ borderColor: "#e5e7eb", color: "#374151", fontSize: "0.875rem" }}>
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl transition-colors"
              style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
