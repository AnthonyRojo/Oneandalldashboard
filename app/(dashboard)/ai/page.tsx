"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, Loader2, RotateCcw, Copy, Check,
  Paperclip, X, FileText, Layers, CheckSquare, Megaphone,
  ClipboardList, PenTool, BarChart2, Plus, BookOpen, Trash2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

interface UploadedFile {
  id: string;
  name: string;
  content: string;
}

interface KnowledgeBaseFile {
  id: string;
  name: string;
  file_size: number;
  token_estimate: number;
  created_at: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Suggestion {
  category: string;
  label: string;
  color: string;
}

interface Agent {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  section: "agents" | "specialized";
  subtitle: string;
  suggestions: Suggestion[];
  systemPrompt: string;
  defaultProvider: "claude" | "gemini";
}

const AGENTS: Agent[] = [
  {
    id: "hub",
    label: "Hub (All agents)",
    icon: Layers,
    color: "#f59e0b",
    section: "agents",
    subtitle: "General-purpose assistant for your whole team",
    suggestions: [
      { category: "Plan", label: "Help me prioritize this week's tasks", color: "#f59e0b" },
      { category: "Draft", label: "Write a team status update", color: "#3b82f6" },
      { category: "Research", label: "Best practices for remote team standups", color: "#8b5cf6" },
      { category: "Review", label: "Review this text and suggest improvements", color: "#10b981" },
    ],
    systemPrompt:
      "You are a helpful AI assistant embedded in the One&All team collaboration dashboard. Help with productivity, writing, brainstorming, task management, and research. Be concise, friendly, and practical. Format responses with markdown when helpful.",
    defaultProvider: "gemini",
  },
  {
    id: "tasks",
    label: "Task Helper",
    icon: CheckSquare,
    color: "#3b82f6",
    section: "specialized",
    subtitle: "Write, prioritize, and organize tasks",
    suggestions: [
      { category: "Template", label: "Create a task description template", color: "#3b82f6" },
      { category: "Priority", label: "Help me prioritize these tasks by impact", color: "#f59e0b" },
      { category: "Breakdown", label: "Break this project into smaller tasks", color: "#8b5cf6" },
      { category: "Estimate", label: "How long should this task take?", color: "#10b981" },
    ],
    systemPrompt:
      "You are a task management expert embedded in the One&All dashboard. Help users write clear task descriptions, estimate effort, prioritize by impact and urgency, and break projects into actionable subtasks. Be structured and practical.",
    defaultProvider: "gemini",
  },
  {
    id: "announcements",
    label: "Announcements",
    icon: Megaphone,
    color: "#ec4899",
    section: "specialized",
    subtitle: "Draft team announcements and updates",
    suggestions: [
      { category: "Update", label: "Draft a project status announcement", color: "#ec4899" },
      { category: "Poll", label: "Write a team poll with answer options", color: "#f59e0b" },
      { category: "Welcome", label: "Write a welcome message for a new member", color: "#3b82f6" },
      { category: "Urgent", label: "Draft an urgent all-hands notice", color: "#ef4444" },
    ],
    systemPrompt:
      "You are a communications specialist embedded in the One&All dashboard. Help users draft clear, engaging team announcements, updates, polls, and notices. Keep messaging professional yet friendly.",
    defaultProvider: "gemini",
  },
  {
    id: "meetings",
    label: "Meeting Notes",
    icon: ClipboardList,
    color: "#8b5cf6",
    section: "specialized",
    subtitle: "Summarize notes and extract action items",
    suggestions: [
      { category: "Summary", label: "Summarize these meeting notes", color: "#8b5cf6" },
      { category: "Actions", label: "Extract action items from these notes", color: "#f59e0b" },
      { category: "Agenda", label: "Create an agenda for our next sprint", color: "#3b82f6" },
      { category: "Recap", label: "Write a meeting recap email", color: "#10b981" },
    ],
    systemPrompt:
      "You are a meeting productivity expert embedded in the One&All dashboard. Help users summarize notes, extract action items with owners and deadlines, create structured agendas, and write recap emails. Prioritize clarity and actionability.",
    defaultProvider: "claude",
  },
  {
    id: "content",
    label: "Content & Copy",
    icon: PenTool,
    color: "#10b981",
    section: "specialized",
    subtitle: "Write, edit, and refine team content",
    suggestions: [
      { category: "Write", label: "Write copy for our next email campaign", color: "#10b981" },
      { category: "Edit", label: "Improve the clarity of this paragraph", color: "#3b82f6" },
      { category: "Tone", label: "Rewrite this in a more professional tone", color: "#8b5cf6" },
      { category: "Ideas", label: "Generate 5 ideas for our next team post", color: "#f59e0b" },
    ],
    systemPrompt:
      "You are a content and copywriting expert embedded in the One&All dashboard. Help write, edit, and refine team emails, announcements, posts, and internal docs. Match the requested tone and keep messaging clear and impactful.",
    defaultProvider: "claude",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart2,
    color: "#f97316",
    section: "specialized",
    subtitle: "Interpret data and build reports",
    suggestions: [
      { category: "Interpret", label: "What do these task completion rates tell us?", color: "#f97316" },
      { category: "Report", label: "Write a team performance summary", color: "#3b82f6" },
      { category: "Metrics", label: "What metrics should we track for our team?", color: "#8b5cf6" },
      { category: "Trends", label: "Identify trends from this data", color: "#10b981" },
    ],
    systemPrompt:
      "You are a data analytics expert embedded in the One&All dashboard. Help interpret team performance data, identify trends, build reports, and define meaningful metrics. Translate data into clear insights and actionable recommendations.",
    defaultProvider: "claude",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} title="Copy"
      className="p-1 rounded hover:bg-gray-100 transition-colors" style={{ color: "#9ca3af" }}>
      {copied
        ? <Check className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function AgentButton({
  agent, active, hasHistory, onClick,
}: {
  agent: Agent; active: boolean; hasHistory: boolean; onClick: () => void;
}) {
  const Icon = agent.icon;
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5 text-left transition-colors"
      style={{ background: active ? `${agent.color}18` : "transparent" }}>
      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: active ? `${agent.color}25` : "#f3f4f6" }}>
        <Icon className="w-3 h-3" style={{ color: active ? agent.color : "#6b7280" }} />
      </div>
      <span className="text-xs flex-1 text-left truncate"
        style={{ color: active ? agent.color : "#374151", fontWeight: active ? 600 : 400 }}>
        {agent.label}
      </span>
      {hasHistory && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: agent.color }} />
      )}
    </button>
  );
}

export default function AIPage() {
  const { currentUser, currentTeamId, accessToken } = useApp();
  const [activeAgentId, setActiveAgentId] = useState("hub");
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [providerPerAgent, setProviderPerAgent] = useState<Record<string, "claude" | "gemini">>({});
  const [sessionIds, setSessionIds] = useState<Record<string, string>>({});
  const [sessionLoaded, setSessionLoaded] = useState<Record<string, boolean>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [kbFiles, setKbFiles] = useState<KnowledgeBaseFile[]>([]);
  const [kbUploading, setKbUploading] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kbFileInputRef = useRef<HTMLInputElement>(null);

  const activeAgent = AGENTS.find((a) => a.id === activeAgentId) ?? AGENTS[0];
  const AgentIcon = activeAgent.icon;
  const messages = conversations[activeAgentId] ?? [];
  const isEmpty = messages.length === 0;
  const activeCount = Object.values(conversations).filter((m) => m.length > 0).length;
  const provider = providerPerAgent[activeAgentId] ?? activeAgent.defaultProvider;
  const toggleProvider = () =>
    setProviderPerAgent((prev) => ({
      ...prev,
      [activeAgentId]: provider === "claude" ? "gemini" : "claude",
    }));

  const fetchKb = useCallback(async () => {
    if (!currentTeamId || !accessToken) return;
    try {
      const res = await api.getKnowledgeBase(currentTeamId, accessToken);
      setKbFiles(res.files ?? []);
    } catch {
      // Non-fatal
    }
  }, [currentTeamId, accessToken]);

  useEffect(() => { fetchKb(); }, [fetchKb]);

  const loadSession = useCallback(async (agentId: string) => {
    if (!currentTeamId || !accessToken) return;
    if (sessionLoaded[agentId]) return;
    setHistoryLoading(true);
    try {
      const res = await api.getLatestSession(currentTeamId, agentId, accessToken);
      if (res.session && res.messages.length > 0) {
        setConversations((prev) => ({ ...prev, [agentId]: res.messages }));
        setSessionIds((prev) => ({ ...prev, [agentId]: res.session.id }));
      }
    } catch {
      // Non-fatal — just start fresh
    } finally {
      setSessionLoaded((prev) => ({ ...prev, [agentId]: true }));
      setHistoryLoading(false);
    }
  }, [currentTeamId, accessToken, sessionLoaded]);

  useEffect(() => { loadSession(activeAgentId); }, [activeAgentId, loadSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const persistMessage = (sessionId: string, role: string, content: string) => {
    if (!currentTeamId || !accessToken) return;
    api.saveMessage(currentTeamId, sessionId, role, content, accessToken).catch(() => {});
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setConversations((prev) => ({ ...prev, [activeAgentId]: newMessages }));
    setInput("");
    setLoading(true);
    setError(null);

    // Resolve or create a session ID, then persist user message
    let sessionId = sessionIds[activeAgentId];
    if (!sessionId && currentTeamId && accessToken) {
      try {
        const title = trimmed.slice(0, 60);
        const res = await api.createSession(currentTeamId, activeAgentId, title, accessToken);
        sessionId = res.session.id;
        setSessionIds((prev) => ({ ...prev, [activeAgentId]: sessionId }));
      } catch {
        // Non-fatal
      }
    }
    if (sessionId) persistMessage(sessionId, "user", trimmed);

    const fileContext = uploadedFiles.length > 0
      ? uploadedFiles.map((f) => `=== ${f.name} ===\n${f.content}`).join("\n\n")
      : undefined;

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: activeAgent.systemPrompt,
          fileContext,
          teamId: currentTeamId,
          provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      const reply = data.text as string;
      setConversations((prev) => ({
        ...prev,
        [activeAgentId]: [...newMessages, { role: "assistant", content: reply }],
      }));
      if (sessionId) persistMessage(sessionId, "assistant", reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get a response.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const clearChat = () => {
    setConversations((prev) => ({ ...prev, [activeAgentId]: [] }));
    setSessionIds((prev) => { const n = { ...prev }; delete n[activeAgentId]; return n; });
    setSessionLoaded((prev) => { const n = { ...prev }; delete n[activeAgentId]; return n; });
    setError(null);
  };
  const resetAll = () => {
    setConversations({});
    setSessionIds({});
    setSessionLoaded({});
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setUploadedFiles((prev) => [
          ...prev.filter((f) => f.name !== file.name),
          { id: `${file.name}-${Date.now()}`, name: file.name, content },
        ]);
      };
      reader.readAsText(file);
    });
    e.target.value = "";
  };

  const handleKbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentTeamId || !accessToken) return;
    setKbUploading(true);
    setKbError(null);
    try {
      await api.uploadKnowledgeBaseFile(currentTeamId, file, accessToken);
      await fetchKb();
    } catch (err) {
      setKbError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setKbUploading(false);
    }
  };

  const deleteKbFile = async (fileId: string) => {
    if (!currentTeamId || !accessToken) return;
    try {
      await api.deleteKnowledgeBaseFile(currentTeamId, fileId, accessToken);
      setKbFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      // Non-fatal
    }
  };

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex h-full">
      {/* ── Sidebar ── */}
      <aside className="flex flex-col border-r flex-shrink-0"
        style={{ width: 208, background: "white", borderColor: "#e5e7eb" }}>

        {/* Header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#111827" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
            </div>
            <span className="font-semibold text-sm" style={{ color: "#111827" }}>One&All AI</span>
          </div>
          {activeCount > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5" style={{ color: "#6b7280", fontSize: "0.7rem" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#22c55e" }} />
              {activeCount} agent{activeCount > 1 ? "s" : ""} active
            </p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-4">

          {/* Agents */}
          <div>
            <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Agents</p>
            {AGENTS.filter((a) => a.section === "agents").map((agent) => (
              <AgentButton key={agent.id} agent={agent}
                active={activeAgentId === agent.id}
                hasHistory={(conversations[agent.id]?.length ?? 0) > 0}
                onClick={() => { setActiveAgentId(agent.id); loadSession(agent.id); }} />
            ))}
          </div>

          {/* Specialized */}
          <div>
            <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Specialized</p>
            {AGENTS.filter((a) => a.section === "specialized").map((agent) => (
              <AgentButton key={agent.id} agent={agent}
                active={activeAgentId === agent.id}
                hasHistory={(conversations[agent.id]?.length ?? 0) > 0}
                onClick={() => { setActiveAgentId(agent.id); loadSession(agent.id); }} />
            ))}
          </div>

          {/* Knowledge Base — persistent, team-wide */}
          <div>
            <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Knowledge Base</p>
            <input ref={kbFileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleKbUpload} />
            <button onClick={() => kbFileInputRef.current?.click()} disabled={kbUploading}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
              style={{ color: kbUploading ? "#9ca3af" : "#6b7280", border: "1px dashed #d1d5db" }}>
              {kbUploading
                ? <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
                : <Plus className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="text-xs">{kbUploading ? "Uploading…" : "Upload PDF"}</span>
            </button>
            {kbError && (
              <p className="px-2 mt-1" style={{ color: "#ef4444", fontSize: "0.65rem" }}>{kbError}</p>
            )}
            {kbFiles.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {kbFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg group"
                    style={{ background: "#f0fdf4" }}>
                    <BookOpen className="w-3 h-3 flex-shrink-0" style={{ color: "#22c55e" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: "#374151" }} title={file.name}>{file.name}</p>
                      <p style={{ color: "#9ca3af", fontSize: "0.6rem" }}>
                        ~{(file.token_estimate ?? 0).toLocaleString()} tokens · {formatBytes(file.file_size ?? 0)}
                      </p>
                    </div>
                    <button onClick={() => deleteKbFile(file.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                      style={{ color: "#9ca3af" }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <p className="px-2 mt-0.5" style={{ color: "#9ca3af", fontSize: "0.65rem" }}>
                  Always in context · cached
                </p>
              </div>
            )}
          </div>

          {/* Session files — temporary */}
          <div>
            <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Session Files</p>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.html,.css,.xml,.yaml,.yml"
              onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
              style={{ color: "#6b7280", border: "1px dashed #d1d5db" }}>
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">Upload file</span>
            </button>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                    style={{ background: "#f9fafb" }}>
                    <FileText className="w-3 h-3 flex-shrink-0" style={{ color: "#6b7280" }} />
                    <span className="text-xs flex-1 truncate" style={{ color: "#374151" }} title={file.name}>
                      {file.name}
                    </span>
                    <button onClick={() => setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                      className="flex-shrink-0 transition-colors hover:text-red-500" style={{ color: "#9ca3af" }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <p className="px-2 mt-0.5" style={{ color: "#9ca3af", fontSize: "0.65rem" }}>
                  Lost on page refresh
                </p>
              </div>
            )}
          </div>

          {/* Session */}
          <div>
            <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Session</p>
            <button onClick={resetAll}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors hover:bg-red-50"
              style={{ color: "#6b7280" }}>
              <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">Reset all agents</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: "#fafaf7" }}>

        {/* Agent header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b flex-shrink-0"
          style={{ background: "white", borderColor: "#e5e7eb" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${activeAgent.color}18` }}>
              <AgentIcon className="w-4 h-4" style={{ color: activeAgent.color }} />
            </div>
            <div>
              <h1 className="font-semibold text-sm" style={{ color: "#111827" }}>{activeAgent.label}</h1>
              <p style={{ color: "#6b7280", fontSize: "0.75rem" }}>{activeAgent.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleProvider}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:shadow-sm"
              style={{
                borderColor: provider === "claude" ? "#f59e0b" : "#3b82f6",
                color: provider === "claude" ? "#f59e0b" : "#3b82f6",
                background: provider === "claude" ? "#fffbeb" : "#eff6ff",
              }}
              title="Switch AI provider">
              <span>{provider === "claude" ? "✦ Claude" : "◆ Gemini"}</span>
            </button>
            {!isEmpty && (
              <button onClick={clearChat}
                className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                style={{ color: "#6b7280", borderColor: "#e5e7eb" }}>
                Clear chat
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isEmpty && historyLoading ? (
            <div className="flex items-center justify-center h-full gap-2" style={{ color: "#9ca3af" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Restoring conversation…</span>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${activeAgent.color}18` }}>
                  <AgentIcon className="w-6 h-6" style={{ color: activeAgent.color }} />
                </div>
                <p className="font-medium mb-1" style={{ color: "#111827", fontSize: "0.9375rem" }}>
                  I&apos;m your <strong>{activeAgent.label}</strong>.
                </p>
                <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{activeAgent.subtitle}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {activeAgent.suggestions.map((s) => (
                  <button key={s.label} onClick={() => send(s.label)}
                    className="px-4 py-3 rounded-2xl border text-left transition-all hover:shadow-md"
                    style={{ background: "white", borderColor: "#e5e7eb" }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: s.color }}>{s.category}</p>
                    <p className="text-sm" style={{ color: "#374151" }}>{s.label}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col gap-5">
              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div key={i} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{
                        background: isUser ? "#f59e0b" : `${activeAgent.color}18`,
                        color: isUser ? "white" : activeAgent.color,
                      }}>
                      {isUser
                        ? (currentUser?.avatar ?? "Y")
                        : <AgentIcon className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                      <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                        style={{
                          background: isUser ? "#111827" : "white",
                          color: isUser ? "white" : "#111827",
                          border: isUser ? "none" : "1px solid #e5e7eb",
                          borderBottomRightRadius: isUser ? 4 : undefined,
                          borderBottomLeftRadius: isUser ? undefined : 4,
                        }}>
                        {msg.content}
                      </div>
                      {!isUser && <CopyButton text={msg.content} />}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: `${activeAgent.color}18` }}>
                    <AgentIcon className="w-3.5 h-3.5" style={{ color: activeAgent.color }} />
                  </div>
                  <div className="px-4 py-3 rounded-2xl border"
                    style={{ background: "white", borderColor: "#e5e7eb", borderBottomLeftRadius: 4 }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#9ca3af" }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center">
                  <p className="text-xs px-4 py-2 rounded-xl inline-block"
                    style={{ background: "#fef2f2", color: "#ef4444" }}>
                    {error}
                  </p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t flex-shrink-0" style={{ background: "white", borderColor: "#e5e7eb" }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2 px-4 py-3 rounded-2xl border transition-colors focus-within:border-gray-300"
              style={{ background: "#f9f9f6", borderColor: "#e5e7eb" }}>
              <button onClick={() => fileInputRef.current?.click()} title="Attach file"
                className="flex-shrink-0 mb-0.5 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                style={{ color: "#9ca3af" }}>
                <Paperclip className="w-4 h-4" />
              </button>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${activeAgent.label}…`}
                rows={1}
                className="flex-1 resize-none outline-none bg-transparent text-sm leading-relaxed"
                style={{ color: "#111827", maxHeight: 160 }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                autoFocus />
              <button onClick={() => send(input)} disabled={!input.trim() || loading}
                className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all mb-0.5"
                style={{
                  background: input.trim() && !loading ? "#111827" : "#e5e7eb",
                  color: input.trim() && !loading ? "white" : "#9ca3af",
                }}>
                {loading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-center mt-2" style={{ color: "#9ca3af", fontSize: "0.65rem" }}>
              ↑ send &nbsp;·&nbsp; shift+↑ new line
              {uploadedFiles.length > 0 && ` · ${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""} in context`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
