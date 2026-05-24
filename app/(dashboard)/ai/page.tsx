"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, Loader2, RotateCcw, Copy, Check,
  Paperclip, X, FileText, Layers, CheckSquare, Megaphone,
  ClipboardList, PenTool, BarChart2, Plus, BookOpen, Trash2,
  Image as ImageIcon, FileSpreadsheet, Mic, MicOff, Download,
  Bookmark, Calendar as CalendarIcon, ChevronDown, ChevronRight, Zap,
} from "lucide-react";
import { useApp, type TeamMember, type Task, type Project, type CalendarEvent, type Announcement } from "@/context/AppContext";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

interface SessionSummary {
  id: string;
  title: string | null;
  updated_at: string;
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

interface AttachedImage {
  data: string;     // base64, no data-URI prefix
  mimeType: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: AttachedImage[];
}

interface PendingImage {
  data: string;
  mimeType: string;
  previewUrl: string;
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
      "You are Hub, the core AI for the One&All team dashboard. You have live access to this team's tasks, members, projects, events, and announcements — reference them directly when relevant.\n\nYou can CREATE tasks directly in the dashboard. When the user asks you to add, create, or make a task, use the create_task tool — don't just describe it, actually create it. Match member names to their IDs from the team context for assignment.\n\nRoute every question to the right mental model:\n- Tasks/priority → RICE scoring or MoSCoW triage\n- Writing → clarity-first, One&All brand voice (confident, warm, inclusive)\n- Meetings → Cornell format, action items as [ACTION] What · Who · By when\n- Data → lead vs lag metrics, OKR framing\n- Planning → dependency mapping, T-shirt sizing (XS <1h → XL >1wk)\n\nBe concise and practical. Use markdown. When you see team context, use it — cite real names, task counts, dates.",
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
      "You are a task management specialist for the One&All dashboard. You have live access to the team's real tasks, assignees, and projects — reference them directly.\n\nYou can CREATE tasks directly in the dashboard. When the user asks you to add, create, or make a task, use the create_task tool — don't just describe it, actually create it. Match member names to their IDs from the team context for assignment.\n\nFrameworks to apply:\n- RICE for prioritization: (Reach × Impact × Confidence) / Effort\n- MoSCoW for triage: Must / Should / Could / Won't\n- SMART for writing tasks: Specific, Measurable, Achievable, Relevant, Time-bound\n- T-shirt sizing: XS <1h | S 1-4h | M 1-2d | L 3-5d | XL >1wk\n\nTask description format: Title | Priority | Estimate | Assignee | Due | Acceptance criteria\n\nAlways surface blockers and dependencies. When reviewing real tasks, flag overdue items and unbalanced workloads. Be structured and direct.",
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
      "You are a communications specialist for the One&All dashboard. You have access to the team's member list and recent announcements.\n\nStandards:\n- The 5 Cs: Clear, Concise, Correct, Compelling, Courteous\n- Urgency tiers: FYI (no action needed) | Action Required (include deadline) | Urgent (same-day response)\n- One CTA per announcement — never bury the ask\n- Polls: neutral question framing, 2-5 balanced options, always state a close date\n- Welcome messages: name + role + how to reach them\n- Inclusive, person-first language; no jargon\n\nWhen drafting, state the urgency tier first, then write. Keep under 150 words unless complexity demands more.",
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
      "You are a meeting productivity specialist for the One&All dashboard. You have access to the team's upcoming and past events and member list.\n\nStandards:\n- Action items always: [ACTION] What → Who → By when. No owner = not an action item, flag it.\n- Summaries follow Cornell structure: Key decisions | Action items | Open questions\n- Agendas: one-line Purpose + Pre-read + time-boxed items (owner per item)\n- Recap email subject: 'Meeting Recap: [title] [date]' → Decisions → Actions → Next steps → Next meeting\n\nBe aggressive extracting actions — 'I'll look into it' is an action item. Flag any item missing an owner or deadline as a risk. Format everything as scannable bullets.",
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
      "You are a content and copywriting specialist for the One&All dashboard. The team's brand guide is in the knowledge base — apply it to all content.\n\nStandards:\n- Clarity-first: cut every word that doesn't earn its place. Target 20% shorter on first edit.\n- F-pattern for digital: most important info in the first sentence\n- Email subjects: <50 chars, benefit-first, no clickbait\n- Tone ladder: Formal → Professional → Friendly → Casual — confirm tone before drafting\n- One&All voice: confident, warm, inclusive, action-oriented (see knowledge base for full guide)\n\nWhen editing, briefly explain each significant cut or change. Never fully rewrite without consent — suggest first, rewrite on approval.",
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
      "You are a data analytics specialist for the One&All dashboard. You have live access to real task and project metrics — analyze them directly, don't ask the user to paste data.\n\nStandards:\n- Always distinguish lead metrics (predictive: velocity, tasks created) from lag metrics (outcome: completion rate, overdue %)\n- Insight format: '[X] is happening → likely because [Y] → recommend [Z]'\n- OKR framing: Objective (directional) + 3-5 measurable Key Results\n- Flag >20% deviation from prior period as a trend worth noting\n- Workload: flag members with >2× team average open tasks\n\nBe specific with numbers — '3 of 8 tasks overdue (37%)' not 'several tasks overdue'. Use tables for comparisons. End every analysis with 1-3 concrete next actions.",
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

function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
        h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5 first:mt-0">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock
            ? <code className="block">{children}</code>
            : <code className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: isUser ? "rgba(255,255,255,0.15)" : "#f3f4f6" }}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="px-3 py-2 rounded-xl text-xs font-mono overflow-x-auto mb-1" style={{ background: isUser ? "rgba(255,255,255,0.12)" : "#f3f4f6" }}>
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 pl-3 italic opacity-80 mb-1" style={{ borderColor: isUser ? "rgba(255,255,255,0.4)" : "#d1d5db" }}>
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-2 opacity-20" />,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-90 hover:opacity-100">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function SessionHistory({
  agentId, sessionsList, sessionIds, openSession, clearChat, deleteSession,
}: {
  agentId: string;
  sessionsList: Record<string, SessionSummary[]>;
  sessionIds: Record<string, string>;
  openSession: (sessionId: string, agentId: string) => void;
  clearChat: () => void;
  deleteSession: (sessionId: string, agentId: string) => void;
}) {
  const sessions = sessionsList[agentId] ?? [];
  if (sessions.length === 0) return null;
  return (
    <div className="ml-3 mt-0.5 mb-1 flex flex-col border-l" style={{ borderColor: "#e5e7eb" }}>
      {sessions.map((s) => {
        const isActive = sessionIds[agentId] === s.id;
        return (
          <div key={s.id} className="flex items-center" style={{ position: "relative" }}
            onMouseEnter={(e) => { const btn = e.currentTarget.querySelector(".del-btn") as HTMLElement; if (btn) btn.style.opacity = "1"; }}
            onMouseLeave={(e) => { const btn = e.currentTarget.querySelector(".del-btn") as HTMLElement; if (btn) btn.style.opacity = "0"; }}>
            <button onClick={() => openSession(s.id, agentId)}
              className="flex items-center gap-1.5 pl-3 pr-1 py-1.5 text-left transition-colors hover:bg-gray-50 flex-1 min-w-0"
              style={{ background: isActive ? "#fafaf0" : "transparent" }}>
              <span className="flex-1 text-xs truncate" style={{ color: isActive ? "#111827" : "#6b7280", fontWeight: isActive ? 500 : 400 }}>
                {s.title ?? "Untitled"}
              </span>
              <span style={{ color: "#9ca3af", fontSize: "0.6rem", flexShrink: 0 }}>{timeAgo(s.updated_at)}</span>
            </button>
            <button onClick={() => deleteSession(s.id, agentId)}
              className="del-btn flex-shrink-0 px-1 py-1.5 transition-colors"
              style={{ color: "#d1d5db", opacity: 0 }} title="Delete"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#d1d5db"; }}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
      <button onClick={clearChat}
        className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-left transition-colors hover:bg-gray-50"
        style={{ color: "#9ca3af" }}>
        <Plus className="w-3 h-3" />
        <span style={{ fontSize: "0.7rem" }}>New chat</span>
      </button>
    </div>
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

function buildTeamContext(
  agentId: string,
  members: TeamMember[],
  tasks: Task[],
  projects: Project[],
  events: CalendarEvent[],
  announcements: Announcement[],
): string {
  const today = new Date().toISOString().split("T")[0];
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const memberLine = members.map((m) => `${m.name} (${m.role}${m.status !== "Available" ? ", " + m.status : ""})`).join(" | ");
  // Include IDs so Claude can reference them when creating/assigning tasks
  const memberWithIds = members.map((m) => `${m.name} [id:${m.id}]`).join(" | ");
  const projectWithIds = projects.map((p) => `${p.name} [id:${p.id}] (${p.status})`).join(" | ");

  if (agentId === "hub") {
    const open = tasks.filter((t) => t.status !== "completed");
    const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
    const weekEvents = events.filter((e) => e.date >= today && e.date <= in7).length;
    const active = projects.filter((p) => p.status === "active").length;
    return `TEAM SNAPSHOT: ${members.length} members | ${open.length} open tasks (${overdue} overdue) | ${weekEvents} events this week | ${active} active projects\nMEMBERS (with IDs for task assignment): ${memberWithIds}\nPROJECTS (with IDs): ${projectWithIds}`;
  }

  if (agentId === "tasks") {
    const pOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    const open = tasks
      .filter((t) => t.status !== "completed")
      .sort((a, b) => (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1))
      .slice(0, 15);
    const overdue = tasks.filter((t) => t.status !== "completed" && t.dueDate && t.dueDate < today).length;
    const mMap = Object.fromEntries(members.map((m) => [m.id, m.name]));
    const taskLines = open.map((t) => {
      const who = t.assigneeIds.map((id) => mMap[id] ?? "?").join(", ") || "unassigned";
      return `[${t.priority[0]}] ${t.title} | ${who} | due:${t.dueDate || "none"} | ${t.status}`;
    }).join("\n");
    return `MEMBERS (with IDs for assignment): ${memberWithIds}\nPROJECTS (with IDs): ${projectWithIds}\nOPEN TASKS (${open.length} shown, ${overdue} overdue):\n${taskLines}`;
  }

  if (agentId === "analytics") {
    const open = tasks.filter((t) => t.status !== "completed");
    const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
    const counts = { todo: 0, "in-progress": 0, review: 0, completed: 0 };
    tasks.forEach((t) => { if (t.status in counts) counts[t.status as keyof typeof counts]++; });
    const byMember = members.map((m) => {
      const mo = open.filter((t) => t.assigneeIds.includes(m.id));
      const od = mo.filter((t) => t.dueDate && t.dueDate < today).length;
      return `${m.name}:${mo.length}${od ? `(${od}od)` : ""}`;
    }).join(" | ");
    const projLine = projects.map((p) => `${p.name}:${p.progress}%(${p.status})`).join(" | ");
    return `TASKS: ${tasks.length} total | todo:${counts.todo} in-progress:${counts["in-progress"]} review:${counts.review} done:${counts.completed} | overdue:${overdue}\nBY MEMBER: ${byMember}\nPROJECTS: ${projLine}`;
  }

  if (agentId === "meetings") {
    const upcoming = events
      .filter((e) => e.date >= today && e.date <= in7)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => `${e.title} | ${e.date} ${e.startTime}-${e.endTime} | ${e.type}`)
      .join("\n") || "none";
    const recent = events
      .filter((e) => e.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .map((e) => `${e.title} | ${e.date}`)
      .join("\n");
    return [`MEMBERS: ${memberLine}`, `UPCOMING (7 days):\n${upcoming}`, recent ? `RECENT:\n${recent}` : ""].filter(Boolean).join("\n");
  }

  if (agentId === "announcements") {
    const recent = [...announcements]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((a) => `"${a.content.slice(0, 60)}…" by ${a.authorName} | ${a.createdAt.split("T")[0]}`)
      .join("\n");
    return [`MEMBERS: ${memberLine}`, recent ? `RECENT:\n${recent}` : ""].filter(Boolean).join("\n");
  }

  if (agentId === "content") {
    return `MEMBERS: ${memberLine}\nBrand guide is in the knowledge base — apply it to all output.`;
  }

  return "";
}

interface SkillProfile {
  id: string;
  label: string;
  emoji: string;
  color: string;
  tag: string;
  injection: string;
}

const SKILL_PROFILES: SkillProfile[] = [
  {
    id: "marketing",
    label: "Marketing",
    emoji: "📣",
    color: "#ec4899",
    tag: "Growth & Campaigns",
    injection: `The user is a marketing professional. Calibrate all responses to this expertise:
- Frameworks to apply: AIDA (Awareness→Interest→Desire→Action), funnel stages (ToFu/MoFu/BoFu), RACE planning, Jobs-to-be-Done
- Metrics to speak fluently: CAC, LTV, LTV:CAC ratio, ROAS, CTR, CPL, MQL→SQL conversion, churn rate, NPS
- Campaign briefs should follow: Objective | Target Audience | Key Message | Channels | KPIs | Budget | Timeline
- Always segment: who is the audience, what is the one CTA, what does success look like in 30/60/90 days
- Channel-specific norms: email (<50 char subject, preheader text), paid (Quality Score, ad relevance), SEO (search intent first, then keywords), social (platform-native formats)
- Use A/B testing mindset — always suggest a control vs variant when proposing copy or campaigns`,
  },
  {
    id: "developer",
    label: "Developer",
    emoji: "💻",
    color: "#6366f1",
    tag: "Code & Architecture",
    injection: `The user is a software developer. Calibrate all responses to this expertise:
- Be technical by default — use precise terminology, don't explain basics (variables, loops, APIs)
- Apply SOLID principles, DRY, separation of concerns, and appropriate design patterns (Factory, Observer, Strategy, etc.)
- When discussing architecture: weigh tradeoffs (monolith vs microservices, REST vs GraphQL, sync vs async, SQL vs NoSQL)
- Performance mindset: O(n) complexity, DB index strategies, caching layers (Redis, CDN), lazy loading
- Security by default: mention auth (JWT/OAuth), input validation, SQL injection, XSS, rate limiting where relevant
- Code suggestions should be production-quality — include error handling, types, edge cases
- Version control: trunk-based dev, feature flags, semantic versioning, conventional commits`,
  },
  {
    id: "pm",
    label: "Project Manager",
    emoji: "📋",
    color: "#3b82f6",
    tag: "Delivery & Planning",
    injection: `The user is a project manager. Calibrate all responses to this expertise:
- Every action item must have: owner + deadline + definition of done. No owner = not an action item, flag it.
- Frameworks: RACI for accountability, RAID log (Risks, Assumptions, Issues, Dependencies), MoSCoW for scope
- Agile: velocity, burndown, sprint goals, epic→story→task hierarchy, retrospective formats (Start/Stop/Continue)
- Waterfall/hybrid: critical path, Gantt dependencies, milestone gates, change control process
- Estimation: T-shirt sizing (XS <1h | S 1-4h | M 1-2d | L 3-5d | XL >1wk), Planning Poker, three-point estimates
- Stakeholder comms: BLUF (Bottom Line Up Front), status RAG (Red/Amber/Green), executive summary first
- Risk: Probability × Impact matrix, always pair a risk with a mitigation and a contingency`,
  },
  {
    id: "data",
    label: "Data Analyst",
    emoji: "📊",
    color: "#f97316",
    tag: "Metrics & Insights",
    injection: `The user is a data analyst. Calibrate all responses to this expertise:
- Distinguish lead metrics (predictive: activity, pipeline) from lag metrics (outcome: revenue, churn)
- Insight format: "[X] is happening → likely because [Y] → recommend [Z] → measure success by [metric]"
- Statistical hygiene: correlation ≠ causation, always ask about sample size, confidence intervals, p-values, and confounds
- Flag >20% period-over-period deviation as a trend worth investigating
- Visualization: bar for comparison, line for trends, scatter for correlation, heatmap for distribution — suggest the right chart type
- OKR framing: Objective (directional) + Key Results (specific, measurable, time-bound, 3-5 per O)
- SQL/data mindset: group-by, joins, window functions, cohort analysis, funnel queries are assumed vocabulary`,
  },
  {
    id: "designer",
    label: "UX Designer",
    emoji: "🎨",
    color: "#8b5cf6",
    tag: "User Experience",
    injection: `The user is a UX/UI designer. Calibrate all responses to this expertise:
- Design thinking phases: Empathize → Define → Ideate → Prototype → Test — anchor advice in the right phase
- User research methods: jobs-to-be-done, user interviews, usability tests, card sorting, journey mapping, affinity diagrams
- Nielsen's 10 heuristics: visibility of system status, match with real world, user control, consistency, error prevention, recognition over recall, flexibility, aesthetic minimalism, help users recover from errors, documentation
- Accessibility: WCAG 2.1 AA minimum — color contrast 4.5:1, focus states, alt text, keyboard nav, ARIA labels
- Component mindset: atoms → molecules → organisms (Atomic Design), design tokens, spacing scale (4px base)
- Metrics: task completion rate, time-on-task, SUS score, error rate, learnability curve
- Avoid: dark patterns, infinite scroll for critical tasks, modal overuse, unlabeled icons`,
  },
  {
    id: "hr",
    label: "HR & People Ops",
    emoji: "👥",
    color: "#10b981",
    tag: "Culture & Hiring",
    injection: `The user works in HR and People Operations. Calibrate all responses to this expertise:
- Employee lifecycle lens: Attract → Hire → Onboard → Develop → Retain → Separate
- Hiring: structured interviews beat unstructured (reduce bias), STAR method (Situation, Task, Action, Result) for behavioral questions, scorecards per competency, diverse panels
- Performance: OKRs for goal alignment, continuous feedback over annual reviews, 9-box grid for talent mapping, PIP structure (issue, expectation, support, timeline)
- Engagement: Gallup Q12 drivers, eNPS as a pulse metric, stay interviews > exit interviews
- Compensation: total rewards framing (base + equity + benefits + growth), internal equity vs market benchmarking, pay bands
- Legal awareness: flag anything touching protected characteristics, wrongful termination, accommodation requests — always suggest legal review
- Culture: psychological safety (Edmondson), inclusion ≠ diversity, belonging indicators`,
  },
  {
    id: "sales",
    label: "Sales & BizDev",
    emoji: "🤝",
    color: "#f59e0b",
    tag: "Pipeline & Deals",
    injection: `The user works in sales or business development. Calibrate all responses to this expertise:
- MEDDIC qualification: Metrics (quantify the pain), Economic Buyer (who signs), Decision Criteria, Decision Process, Identify Pain, Champion (internal advocate)
- SPIN selling: Situation → Problem → Implication → Need-Payoff questions before pitching
- Pipeline hygiene: stage-by-stage conversion rates, deal velocity (days per stage), weighted pipeline vs commit
- Discovery call structure: 2 min rapport → 5 min situation questions → 10 min pain/implication → 5 min vision of solved → close for next step
- Objection handling: acknowledge → clarify → reframe → evidence → close (never argue)
- Outbound: personalization > volume, trigger-based outreach (funding, headcount, job posts), multi-touch sequences (email + LinkedIn + call)
- Proposal/pricing: anchor high, present 3 tiers (Good/Better/Best), ROI calculation, clear next step and expiry`,
  },
  {
    id: "finance",
    label: "Finance",
    emoji: "💰",
    color: "#14b8a6",
    tag: "Budgets & Forecasts",
    injection: `The user has a finance or operations background. Calibrate all responses to this expertise:
- Three statements: P&L (revenue − COGS = gross profit − OpEx = EBITDA), Cash Flow (operating/investing/financing), Balance Sheet (assets = liabilities + equity)
- SaaS metrics: ARR, MRR, net revenue retention (NRR), gross revenue retention (GRR), churn rate, quick ratio (new MRR + expansion) / (churned + contraction)
- Unit economics: CAC payback period, LTV:CAC ratio (healthy = 3:1+), contribution margin per unit
- Cash management: runway = cash / monthly burn, burn multiple = net burn / net new ARR (healthy <1.5)
- Investment decisions: NPV, IRR, payback period — always present a base/upside/downside scenario
- Budget process: zero-based vs incremental, variance analysis (budget vs actual), rolling 13-week cash forecast
- Headcount: fully-loaded cost (salary + benefits + overhead ~1.25–1.4×), productivity metrics per FTE`,
  },
  {
    id: "content",
    label: "Content Strategist",
    emoji: "✍️",
    color: "#06b6d4",
    tag: "Copy & Strategy",
    injection: `The user is a content strategist and copywriter. Calibrate all responses to this expertise:
- Content strategy pillars: authority (thought leadership), community (engagement), conversion (demand gen), care (support/retention)
- SEO mindset: search intent first (informational/navigational/commercial/transactional), keyword clustering, topic authority, internal linking, E-E-A-T signals
- Copy principles: F-pattern for web (most important info top-left), inverted pyramid (conclusion first), one idea per sentence, active voice, cut adverbs
- Format rules: email subject <50 chars (benefit-first, no clickbait), headlines 6-8 words, CTAs = verb + value ("Get your free audit" not "Click here")
- Editorial calendar: pillar content → cluster posts → distribution → repurpose (1 long-form → 5 social posts → 1 email → 1 short video script)
- Voice and tone: confirm brand voice before drafting; tone ladder — Formal → Professional → Friendly → Casual
- Metrics: organic traffic, time-on-page, scroll depth, conversion rate by content type, content-influenced pipeline`,
  },
  {
    id: "cs",
    label: "Customer Success",
    emoji: "⭐",
    color: "#84cc16",
    tag: "Retention & Support",
    injection: `The user works in Customer Success. Calibrate all responses to this expertise:
- Customer health scoring: login frequency, feature adoption depth, support ticket volume/sentiment, QBR attendance, expansion history — flag accounts scoring red/amber
- Churn signals: no login >14 days, champion left the company, open critical tickets >7 days, missed QBR, billing disputes
- QBR structure (60 min): Wins since last QBR → Usage & ROI review → Roadmap preview → Blockers & risks → Next 90-day goals → Expansion discussion
- Metrics to own: GRR (gross revenue retention), NRR (net revenue retention), NPS/CSAT/CES, time-to-value (TTV), onboarding completion rate
- Onboarding: define success milestone with customer day 1, time-box onboarding (30/60/90 day plan), celebrate first value moment
- Expansion playbook: only upsell after customer achieves core value; cross-sell when adjacent pain is confirmed; use usage data as the trigger
- EBR (Executive Business Review) framing: tie product usage to customer's business outcomes, not feature lists`,
  },
];

interface SavedPrompt {
  id: string;
  text: string;
  savedAt: string;
}

interface PromptTemplate {
  category: string;
  label: string;
  template: string;
  color: string;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  { category: "Planning", label: "Sprint update", color: "#3b82f6",
    template: "Write a sprint update for week ending [DATE]. Completed: [TASKS DONE]. Blocked by: [BLOCKERS]. Next week goals: [GOALS]." },
  { category: "Planning", label: "Break down project", color: "#3b82f6",
    template: "Break [PROJECT NAME] into actionable tasks. Timeline: [TIMELINE]. Team size: [N] people. Key constraints: [CONSTRAINTS]." },
  { category: "Hiring", label: "Job description", color: "#10b981",
    template: "Write a job description for [ROLE] on the [TEAM] team. Must-have requirements: [REQUIREMENTS]. Nice-to-have: [NICE TO HAVE]. Salary range: [RANGE]." },
  { category: "Hiring", label: "Interview questions", color: "#10b981",
    template: "Write 5 behavioral interview questions for a [ROLE] role focused on [SKILL OR COMPETENCY]. Include what a strong answer looks like for each." },
  { category: "Hiring", label: "Performance review", color: "#10b981",
    template: "Write a performance review summary for [NAME] covering [TIME PERIOD]. Strengths: [STRENGTHS]. Areas to grow: [AREAS]. Overall rating: [RATING]." },
  { category: "Comms", label: "Project announcement", color: "#ec4899",
    template: "Write a project kickoff announcement for [PROJECT NAME]. Start date: [DATE]. Team: [MEMBERS]. Goal: [GOAL]. First milestone: [MILESTONE]." },
  { category: "Comms", label: "Email draft", color: "#ec4899",
    template: "Draft a [professional/friendly/urgent] email to [RECIPIENT] about [TOPIC]. Key points to cover: [POINTS]. Desired outcome: [OUTCOME]." },
  { category: "Comms", label: "Team retro", color: "#ec4899",
    template: "Run a retrospective for [TEAM] on [PROJECT/SPRINT]. What went well: [WINS]. What didn't: [ISSUES]. Suggested actions: [ACTIONS]." },
  { category: "Analysis", label: "Meeting summary", color: "#f97316",
    template: "Summarize these meeting notes, extract all action items with owners and deadlines, and list any open questions:\n\n[PASTE MEETING NOTES HERE]" },
  { category: "Analysis", label: "Data insights", color: "#f97316",
    template: "Analyze this data and give me the top 3 insights with a recommended action for each:\n\n[PASTE DATA HERE]" },
  { category: "Analysis", label: "Competitive analysis", color: "#f97316",
    template: "Compare [OUR PRODUCT] against [COMPETITOR]. Focus on: pricing, features, target audience, and positioning. Recommend where we should differentiate." },
  { category: "Strategy", label: "OKR draft", color: "#8b5cf6",
    template: "Draft OKRs for [TEAM/COMPANY] for [QUARTER]. Focus area: [FOCUS]. Current baseline metrics: [METRICS]. Desired outcome in one sentence: [OUTCOME]." },
  { category: "Strategy", label: "Proposal", color: "#8b5cf6",
    template: "Write a proposal for [INITIATIVE]. Problem it solves: [PROBLEM]. Estimated effort: [EFFORT]. Expected impact: [IMPACT]. Risks: [RISKS]. Ask: [WHAT YOU NEED]." },
];

function compressImage(file: File): Promise<PendingImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX_PX = 1500;
        let { width, height } = img;
        if (width > MAX_PX) {
          height = Math.round((height * MAX_PX) / width);
          width = MAX_PX;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, 0.82);
        const [prefix, data] = dataUrl.split(",");
        const mt = prefix.split(":")[1].split(";")[0];
        resolve({ data, mimeType: mt, previewUrl: dataUrl });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AIPage() {
  const {
    currentUser, currentTeamId, accessToken,
    currentMembers, currentTasks, currentProjects, currentEvents, currentAnnouncements,
  } = useApp();
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
  const [sessionsList, setSessionsList] = useState<Record<string, SessionSummary[]>>({});
  const [kbFiles, setKbFiles] = useState<KnowledgeBaseFile[]>([]);
  const [kbUploading, setKbUploading] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("ai_active_skills");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const toggleSkill = (id: string) => {
    setActiveSkillIds((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      try { localStorage.setItem("ai_active_skills", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() => {
    try { return JSON.parse(localStorage.getItem("ai_saved_prompts") || "[]"); } catch { return []; }
  });
  const [isListening, setIsListening] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [savedPromptsOpen, setSavedPromptsOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const kbFileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

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

  const loadSessionsList = useCallback(async (agentId: string) => {
    if (!currentTeamId || !accessToken) return;
    try {
      const res = await api.listSessions(currentTeamId, agentId, accessToken);
      setSessionsList((prev) => ({ ...prev, [agentId]: res.sessions ?? [] }));
    } catch { /* Non-fatal */ }
  }, [currentTeamId, accessToken]);

  useEffect(() => { loadSessionsList(activeAgentId); }, [activeAgentId, loadSessionsList]);

  const openSession = async (sessionId: string, agentId: string) => {
    if (!currentTeamId || !accessToken) return;
    try {
      const res = await api.loadSession(currentTeamId, sessionId, accessToken);
      if (res.messages) {
        setConversations((prev) => ({ ...prev, [agentId]: res.messages }));
        setSessionIds((prev) => ({ ...prev, [agentId]: sessionId }));
        setSessionLoaded((prev) => ({ ...prev, [agentId]: true }));
      }
    } catch { /* Non-fatal */ }
  };

  const deleteSession = async (sessionId: string, agentId: string) => {
    if (!currentTeamId || !accessToken) return;
    try {
      await api.deleteSession(currentTeamId, sessionId, accessToken);
      // Remove from list
      setSessionsList((prev) => ({
        ...prev,
        [agentId]: (prev[agentId] ?? []).filter((s) => s.id !== sessionId),
      }));
      // If it was the active session, clear the chat
      if (sessionIds[agentId] === sessionId) {
        setConversations((prev) => ({ ...prev, [agentId]: [] }));
        setSessionIds((prev) => { const n = { ...prev }; delete n[agentId]; return n; });
        setSessionLoaded((prev) => ({ ...prev, [agentId]: true }));
      }
    } catch { /* Non-fatal */ }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const persistMessage = (sessionId: string, role: string, content: string) => {
    if (!currentTeamId || !accessToken) return;
    api.saveMessage(currentTeamId, sessionId, role, content, accessToken).catch(() => {});
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && pendingImages.length === 0) || loading) return;

    const imgs = pendingImages;
    setPendingImages([]);

    const userMsg: Message = {
      role: "user",
      content: trimmed,
      ...(imgs.length > 0 ? { images: imgs.map((i) => ({ data: i.data, mimeType: i.mimeType })) } : {}),
    };
    const newMessages: Message[] = [...messages, userMsg];
    setConversations((prev) => ({ ...prev, [activeAgentId]: newMessages }));
    setInput("");
    setLoading(true);
    setError(null);

    // Resolve or create a session ID, then persist user message
    let sessionId = sessionIds[activeAgentId];
    if (!sessionId && currentTeamId && accessToken) {
      try {
        const title = (trimmed || "Image").slice(0, 60);
        const res = await api.createSession(currentTeamId, activeAgentId, title, accessToken);
        sessionId = res.session.id;
        setSessionIds((prev) => ({ ...prev, [activeAgentId]: sessionId }));
      } catch {
        // Non-fatal
      }
    }
    // Persist text only — image data is too large for DB
    if (sessionId) persistMessage(sessionId, "user", trimmed || `(${imgs.length} image${imgs.length > 1 ? "s" : ""})`);

    const fileContext = uploadedFiles.length > 0
      ? uploadedFiles.map((f) => `=== ${f.name} ===\n${f.content}`).join("\n\n")
      : undefined;

    const teamContext = buildTeamContext(
      activeAgentId, currentMembers, currentTasks, currentProjects, currentEvents, currentAnnouncements,
    ) || undefined;

    // Strip image data from history messages — only the current message carries the image
    const apiMessages = newMessages.map((m, i) =>
      i === newMessages.length - 1 ? m : { role: m.role, content: m.content }
    );

    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (accessToken) headers["authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/ai", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: activeSkillIds.length > 0
            ? activeAgent.systemPrompt + "\n\n---\nUser context:\n" +
              SKILL_PROFILES.filter((s) => activeSkillIds.includes(s.id)).map((s) => s.injection).join(" ")
            : activeAgent.systemPrompt,
          fileContext,
          teamContext,
          teamId: currentTeamId,
          provider,
        }),
      });
      let data: { text?: string; error?: string; toolData?: unknown; usedProvider?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.status === 413
            ? "Image is too large to send. Try a smaller image (under 5 MB)."
            : `Server error (${res.status}). Please try again.`
        );
      }
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      const reply = data.text as string;
      // If the server switched to Claude for image analysis, update the badge
      if (data.usedProvider && data.usedProvider !== provider) {
        setProviderPerAgent((prev) => ({ ...prev, [activeAgentId]: data.usedProvider }));
      }
      // Append AI reply; append system cards for created tasks/events
      const assistantMessages: Message[] = [{ role: "assistant", content: reply }];
      const toolData = data.toolData as Record<string, unknown> | undefined;
      if (toolData?.createdTask) {
        assistantMessages.push({ role: "assistant", content: `__task_created__:${JSON.stringify(toolData.createdTask)}` });
      }
      if (toolData?.createdEvent) {
        assistantMessages.push({ role: "assistant", content: `__event_created__:${JSON.stringify(toolData.createdEvent)}` });
      }
      setConversations((prev) => ({
        ...prev,
        [activeAgentId]: [...newMessages, ...assistantMessages],
      }));
      if (sessionId) persistMessage(sessionId, "assistant", reply);
      loadSessionsList(activeAgentId);
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
    // Keep sessionLoaded=true so loadSession doesn't immediately re-fetch the old session
    setSessionLoaded((prev) => ({ ...prev, [activeAgentId]: true }));
    setError(null);
  };
  const resetAll = () => {
    const allLoaded: Record<string, boolean> = {};
    AGENTS.forEach((a) => { allLoaded[a.id] = true; });
    setConversations({});
    setSessionIds({});
    setSessionLoaded(allLoaded);
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const isCsv = /\.csv$/i.test(file.name);
      if (isExcel) {
        try {
          const { read, utils } = await import("xlsx");
          const data = new Uint8Array(await file.arrayBuffer());
          const wb = read(data, { type: "array" });
          const parts: string[] = [`[Spreadsheet: ${file.name} | Sheets: ${wb.SheetNames.join(", ")}]`];
          for (const name of wb.SheetNames) {
            const csv = utils.sheet_to_csv(wb.Sheets[name]);
            const rows = csv.split("\n").filter((r) => r.trim());
            const MAX = 500;
            const note = rows.length > MAX ? ` — first ${MAX} of ${rows.length} rows` : "";
            parts.push(`=== ${name}${note} ===\n${rows.slice(0, MAX).join("\n")}`);
          }
          const content = parts.join("\n\n");
          setUploadedFiles((prev) => [
            ...prev.filter((f) => f.name !== file.name),
            { id: `${file.name}-${Date.now()}`, name: file.name, content },
          ]);
        } catch {
          setError(`Could not parse ${file.name}. Make sure it's a valid Excel file.`);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          let content = ev.target?.result as string;
          if (isCsv) {
            const rows = content.split("\n").filter((r) => r.trim());
            const MAX = 500;
            if (rows.length > MAX) content = rows.slice(0, MAX).join("\n") + `\n[...${rows.length - MAX} more rows truncated]`;
          }
          setUploadedFiles((prev) => [
            ...prev.filter((f) => f.name !== file.name),
            { id: `${file.name}-${Date.now()}`, name: file.name, content },
          ]);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) { setError(`${file.name} must be under 20 MB.`); continue; }
      try {
        const compressed = await compressImage(file);
        setPendingImages((prev) => [...prev, compressed]);
      } catch {
        setError(`Could not process ${file.name}.`);
      }
    }
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

  // ── Voice input ──────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Voice input isn't supported in this browser. Try Chrome."); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput(transcript);
      const el = inputRef.current;
      if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    r.start();
    recognitionRef.current = r;
    setIsListening(true);
  };

  // ── Saved prompts ─────────────────────────────────────────────────────────
  const saveCurrentPrompt = () => {
    const text = input.trim();
    if (!text) return;
    setSavedPrompts((prev) => {
      const next = [{ id: Date.now().toString(), text, savedAt: new Date().toISOString() }, ...prev].slice(0, 20);
      try { localStorage.setItem("ai_saved_prompts", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const deleteSavedPrompt = (id: string) => {
    setSavedPrompts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try { localStorage.setItem("ai_saved_prompts", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Export chat ───────────────────────────────────────────────────────────
  const exportChat = () => {
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const rows = messages
      .filter((m) => !m.content.startsWith("__task_created__") && !m.content.startsWith("__event_created__"))
      .map((m) => {
        const who = m.role === "user" ? "You" : activeAgent.label;
        const body = m.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        return `<div class="msg ${m.role}"><div class="who">${who}</div><div class="body">${body}</div></div>`;
      }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeAgent.label} — ${date}</title>
<style>
  body{font-family:-apple-system,sans-serif;max-width:720px;margin:48px auto;padding:24px;color:#111827}
  h1{font-size:1.1rem;font-weight:700;border-bottom:2px solid #e5e7eb;padding-bottom:12px;margin-bottom:24px}
  .msg{margin:16px 0}
  .who{font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:4px}
  .user .who{color:#f59e0b}
  .body{background:#f9fafb;border-radius:10px;padding:12px 16px;font-size:0.9rem;line-height:1.65;white-space:pre-wrap}
  .user .body{background:#111827;color:white}
  @media print{body{margin:16px}}
</style></head><body>
<h1>${activeAgent.label} &nbsp;·&nbsp; ${date}</h1>${rows}</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 400);
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
              <div key={agent.id}>
                <AgentButton agent={agent}
                  active={activeAgentId === agent.id}
                  hasHistory={(sessionsList[agent.id]?.length ?? 0) > 0}
                  onClick={() => { setActiveAgentId(agent.id); loadSession(agent.id); loadSessionsList(agent.id); }} />
                {activeAgentId === agent.id && <SessionHistory agentId={agent.id} sessionsList={sessionsList} sessionIds={sessionIds} openSession={openSession} clearChat={clearChat} deleteSession={deleteSession} />}
              </div>
            ))}
          </div>

          {/* Specialized */}
          <div>
            <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Specialized</p>
            {AGENTS.filter((a) => a.section === "specialized").map((agent) => (
              <div key={agent.id}>
                <AgentButton agent={agent}
                  active={activeAgentId === agent.id}
                  hasHistory={(sessionsList[agent.id]?.length ?? 0) > 0}
                  onClick={() => { setActiveAgentId(agent.id); loadSession(agent.id); loadSessionsList(agent.id); }} />
                {activeAgentId === agent.id && <SessionHistory agentId={agent.id} sessionsList={sessionsList} sessionIds={sessionIds} openSession={openSession} clearChat={clearChat} deleteSession={deleteSession} />}
              </div>
            ))}
          </div>

          {/* Skills */}
          <div>
            <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>
              Your Skills
              {activeSkillIds.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-white" style={{ background: "#6366f1", fontSize: "0.6rem" }}>
                  {activeSkillIds.length}
                </span>
              )}
            </p>
            <p className="px-2 mb-2" style={{ color: "#9ca3af", fontSize: "0.65rem", lineHeight: 1.4 }}>
              Toggle your role — added to every prompt automatically.
            </p>
            <div className="flex flex-col gap-0.5">
              {SKILL_PROFILES.map((skill) => {
                const active = activeSkillIds.includes(skill.id);
                return (
                  <button key={skill.id} onClick={() => toggleSkill(skill.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all"
                    style={{
                      background: active ? `${skill.color}15` : "transparent",
                      border: active ? `1px solid ${skill.color}40` : "1px solid transparent",
                    }}>
                    <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>{skill.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: active ? skill.color : "#374151" }}>
                        {skill.label}
                      </p>
                      <p style={{ color: "#9ca3af", fontSize: "0.6rem" }}>{skill.tag}</p>
                    </div>
                    {active && (
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: skill.color }} />
                    )}
                  </button>
                );
              })}
            </div>
            {activeSkillIds.length > 0 && (
              <button onClick={() => {
                setActiveSkillIds([]);
                try { localStorage.removeItem("ai_active_skills"); } catch { /* ignore */ }
              }}
                className="mt-1.5 w-full text-center py-1 rounded-lg transition-colors hover:bg-gray-50"
                style={{ color: "#9ca3af", fontSize: "0.65rem" }}>
                Clear all skills
              </button>
            )}
          </div>

          {/* Saved Prompts */}
          <div>
            <button onClick={() => setSavedPromptsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-2 mb-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                Saved Prompts
                {savedPrompts.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-white" style={{ background: "#f59e0b", fontSize: "0.6rem" }}>
                    {savedPrompts.length}
                  </span>
                )}
              </p>
              {savedPromptsOpen
                ? <ChevronDown className="w-3 h-3" style={{ color: "#9ca3af" }} />
                : <ChevronRight className="w-3 h-3" style={{ color: "#9ca3af" }} />}
            </button>
            {savedPromptsOpen && (
              <div className="flex flex-col gap-1">
                {savedPrompts.length === 0 && (
                  <p className="px-2 py-1.5 text-xs" style={{ color: "#9ca3af" }}>
                    Type a prompt and click <Bookmark className="w-3 h-3 inline mx-0.5" /> to save it.
                  </p>
                )}
                {savedPrompts.map((p) => (
                  <div key={p.id} className="flex items-start gap-1 px-2 py-1.5 rounded-lg group hover:bg-gray-50">
                    <button className="flex-1 text-left min-w-0" onClick={() => { setInput(p.text); inputRef.current?.focus(); }}>
                      <p className="text-xs truncate" style={{ color: "#374151" }} title={p.text}>{p.text}</p>
                    </button>
                    <button onClick={() => deleteSavedPrompt(p.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#d1d5db" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#d1d5db"; }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt Templates */}
          <div>
            <button onClick={() => setTemplatesOpen((v) => !v)}
              className="w-full flex items-center justify-between px-2 mb-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
                <Zap className="w-3 h-3" />
                Templates
              </p>
              {templatesOpen
                ? <ChevronDown className="w-3 h-3" style={{ color: "#9ca3af" }} />
                : <ChevronRight className="w-3 h-3" style={{ color: "#9ca3af" }} />}
            </button>
            {templatesOpen && (
              <div className="flex flex-col gap-0.5">
                {Array.from(new Set(PROMPT_TEMPLATES.map((t) => t.category))).map((cat) => (
                  <div key={cat} className="mb-1">
                    <p className="px-2 mb-0.5 text-xs font-medium" style={{ color: "#9ca3af" }}>{cat}</p>
                    {PROMPT_TEMPLATES.filter((t) => t.category === cat).map((t) => (
                      <button key={t.label}
                        onClick={() => { setInput(t.template); setTemplatesOpen(false); setTimeout(() => inputRef.current?.focus(), 50); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-50 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                        <span className="text-xs" style={{ color: "#374151" }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
                <p className="px-2 mt-0.5" style={{ color: "#9ca3af", fontSize: "0.6rem" }}>
                  Click to fill input · edit [PLACEHOLDERS] before sending
                </p>
              </div>
            )}
          </div>

          {/* Knowledge Base — persistent, team-wide */}
          <div>
            <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Knowledge Base</p>
            <input ref={kbFileInputRef} type="file" accept=".pdf,.md,.txt,text/plain,text/markdown,application/pdf" className="hidden" onChange={handleKbUpload} />
            <button onClick={() => kbFileInputRef.current?.click()} disabled={kbUploading}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
              style={{ color: kbUploading ? "#9ca3af" : "#6b7280", border: "1px dashed #d1d5db" }}>
              {kbUploading
                ? <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
                : <Plus className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="text-xs">{kbUploading ? "Uploading…" : "Upload PDF / MD / TXT"}</span>
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
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
              style={{ color: "#6b7280", border: "1px dashed #d1d5db" }}>
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">Upload file / CSV / Excel</span>
            </button>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {uploadedFiles.map((file) => {
                  const isSpreadsheet = /\.(csv|xlsx|xls)$/i.test(file.name);
                  return (
                  <div key={file.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                    style={{ background: isSpreadsheet ? "#f0fdf4" : "#f9fafb" }}>
                    {isSpreadsheet
                      ? <FileSpreadsheet className="w-3 h-3 flex-shrink-0" style={{ color: "#16a34a" }} />
                      : <FileText className="w-3 h-3 flex-shrink-0" style={{ color: "#6b7280" }} />}
                    <span className="text-xs flex-1 truncate" style={{ color: "#374151" }} title={file.name}>
                      {file.name}
                    </span>
                    <button onClick={() => setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                      className="flex-shrink-0 transition-colors hover:text-red-500" style={{ color: "#9ca3af" }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  );
                })}
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
            {!isEmpty && currentTeamId && (
              <button
                onClick={() => send("Please summarize what we've discussed into a clear, actionable task title and description, then add it to the team's task list using your task creation tool.")}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-blue-50"
                style={{ color: "#3b82f6", borderColor: "#bfdbfe", background: "#eff6ff" }}
                title="Summarize this conversation and create a task">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Add as task</span>
              </button>
            )}
            {!isEmpty && (
              <button onClick={exportChat}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                style={{ color: "#6b7280", borderColor: "#e5e7eb" }}
                title="Export chat as PDF">
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            )}
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

                // Task-created system card
                if (!isUser && msg.content.startsWith("__task_created__:")) {
                  let task: { title: string; priority: string; status: string; dueDate?: string } | null = null;
                  try { task = JSON.parse(msg.content.slice("__task_created__:".length)); } catch { /* ignore */ }
                  return (
                    <div key={i} className="flex justify-center">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }}>
                        <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          Task created: <strong>{task?.title ?? "New task"}</strong>
                          {task?.priority && ` · ${task.priority}`}
                          {task?.dueDate && ` · due ${task.dueDate}`}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Event-created system card
                if (!isUser && msg.content.startsWith("__event_created__:")) {
                  let ev: { title: string; date: string; startTime: string; type?: string } | null = null;
                  try { ev = JSON.parse(msg.content.slice("__event_created__:".length)); } catch { /* ignore */ }
                  const time = ev?.startTime ? new Date(ev.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <div key={i} className="flex justify-center">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}>
                        <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          Event added: <strong>{ev?.title ?? "New event"}</strong>
                          {ev?.date && ` · ${ev.date}`}
                          {time && ` at ${time}`}
                          {ev?.type && ` · ${ev.type}`}
                        </span>
                      </div>
                    </div>
                  );
                }

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
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.images.map((img, j) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={j}
                              src={`data:${img.mimeType};base64,${img.data}`}
                              alt="attached"
                              className="object-cover rounded-2xl"
                              style={{
                                maxWidth: msg.images!.length === 1 ? 260 : 120,
                                maxHeight: msg.images!.length === 1 ? 200 : 120,
                                borderBottomRightRadius: isUser ? 4 : undefined,
                                borderBottomLeftRadius: isUser ? undefined : 4,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {msg.content && (
                        <div className="px-4 py-3 rounded-2xl text-sm"
                          style={{
                            background: isUser ? "#111827" : "white",
                            color: isUser ? "white" : "#111827",
                            border: isUser ? "none" : "1px solid #e5e7eb",
                            borderBottomRightRadius: isUser ? 4 : undefined,
                            borderBottomLeftRadius: isUser ? undefined : 4,
                          }}>
                          {isUser
                            ? <span className="leading-relaxed whitespace-pre-wrap">{msg.content}</span>
                            : <MarkdownContent content={msg.content} isUser={false} />}
                        </div>
                      )}
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
            <div className="flex flex-col gap-2 px-4 py-3 rounded-2xl border transition-colors focus-within:border-gray-300"
              style={{ background: "#f9f9f6", borderColor: "#e5e7eb" }}>

              {/* Pending image previews */}
              {pendingImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="relative inline-flex flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt="preview"
                        className="h-16 w-16 object-cover rounded-xl border"
                        style={{ borderColor: "#e5e7eb" }} />
                      <button onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "#374151", color: "white" }}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.html,.css,.xml,.yaml,.yml,.xlsx,.xls"
                  onChange={handleFileUpload} />
                <input ref={imageInputRef} type="file" multiple className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect} />
                <button onClick={() => fileInputRef.current?.click()} title="Attach file or spreadsheet"
                  className="flex-shrink-0 mb-0.5 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  style={{ color: uploadedFiles.length > 0 ? "#10b981" : "#9ca3af" }}>
                  <Paperclip className="w-4 h-4" />
                </button>
                <button onClick={() => imageInputRef.current?.click()} title="Attach images"
                  className="flex-shrink-0 mb-0.5 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  style={{ color: pendingImages.length > 0 ? "#3b82f6" : "#9ca3af" }}>
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button onClick={toggleVoice} title={isListening ? "Stop recording" : "Voice input"}
                  className="flex-shrink-0 mb-0.5 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  style={{ color: isListening ? "#ef4444" : "#9ca3af", background: isListening ? "#fef2f2" : "transparent" }}>
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                {input.trim() && (
                  <button onClick={saveCurrentPrompt} title="Save this prompt"
                    className="flex-shrink-0 mb-0.5 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    style={{ color: "#9ca3af" }}>
                    <Bookmark className="w-4 h-4" />
                  </button>
                )}
                <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pendingImages.length > 0 ? "Add a caption or just send…" : `Ask ${activeAgent.label}…`}
                  rows={1}
                  className="flex-1 resize-none outline-none bg-transparent text-sm leading-relaxed"
                  style={{ color: "#111827", maxHeight: 160 }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  autoFocus />
                <button onClick={() => send(input)} disabled={(!input.trim() && pendingImages.length === 0) || loading}
                  className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all mb-0.5"
                  style={{
                    background: (input.trim() || pendingImages.length > 0) && !loading ? "#111827" : "#e5e7eb",
                    color: (input.trim() || pendingImages.length > 0) && !loading ? "white" : "#9ca3af",
                  }}>
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
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
