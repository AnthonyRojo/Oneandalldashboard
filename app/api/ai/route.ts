import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdmin, getAuthUser, logActivity } from "@/lib/api-helpers";

type AttachedImage = { data: string; mimeType: string };

type Message = {
  role: string;
  content: string;
  images?: AttachedImage[];
};

type ClaudeContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

type ClaudeApiMessage = {
  role: "user" | "assistant";
  content: string | ClaudeContent[] | object[];
};

const CREATE_EVENT_TOOL = {
  name: "create_calendar_event",
  description:
    "Create a new calendar event for the team. Use this when the user asks to schedule, add, or create a meeting, event, deadline, reminder, or appointment. If required info is missing (title, date/time), ask for it before calling this tool.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Event title" },
      description: { type: "string", description: "Optional agenda or details" },
      startTime: {
        type: "string",
        description: "Start date/time in ISO 8601 format (YYYY-MM-DDTHH:mm:00). Required.",
      },
      endTime: {
        type: "string",
        description: "End date/time in ISO 8601 format. Defaults to 1 hour after start if not given.",
      },
      type: {
        type: "string",
        enum: ["Meeting", "Deadline", "Review", "Social", "Other"],
        description: "Event type — default to Meeting",
      },
      location: { type: "string", description: "Optional physical location or video link" },
      link: { type: "string", description: "Optional meeting URL (Zoom, Google Meet, etc.)" },
      allDay: { type: "boolean", description: "True only for all-day events like deadlines" },
      color: { type: "string", description: "Optional hex color for the calendar card" },
    },
    required: ["title", "startTime"],
  },
};

const CREATE_TASK_TOOL = {
  name: "create_task",
  description:
    "Create a new task in the team's task list. Use this when the user asks you to add, create, or make a task. Extract all relevant details (title, priority, due date, assignee, project) from the user's message.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short, action-oriented task title" },
      description: { type: "string", description: "Optional detailed description" },
      priority: {
        type: "string",
        enum: ["High", "Medium", "Low"],
        description: "Task priority — default to Medium if not specified",
      },
      dueDate: {
        type: "string",
        description: "Due date in YYYY-MM-DD format, only if the user specifies one",
      },
      assigneeId: {
        type: "string",
        description:
          "Member ID (uuid) to assign the task to, if the user names a member. Match the name to the IDs in the team context.",
      },
      projectId: {
        type: "string",
        description: "Project ID (uuid) to link the task to, if the user mentions a project name",
      },
      status: {
        type: "string",
        enum: ["todo", "in-progress", "review", "completed"],
        description: "Initial status — default to todo",
      },
      tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
    },
    required: ["title"],
  },
};

function buildClaudeMessages(messages: Message[]): ClaudeApiMessage[] {
  return messages.map((m) => {
    if (m.images && m.images.length > 0) {
      const parts: ClaudeContent[] = m.images.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: img.mimeType, data: img.data },
      }));
      if (m.content) parts.push({ type: "text", text: m.content });
      return { role: m.role as "user" | "assistant", content: parts };
    }
    return { role: m.role as "user" | "assistant", content: m.content };
  });
}

async function rawClaudeCall(
  messages: ClaudeApiMessage[],
  system: string,
  apiKey: string,
  tools?: object[]
): Promise<{ content: object[]; stop_reason: string }> {
  const body: Record<string, unknown> = {
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
  };
  if (tools && tools.length > 0) body.tools = tools;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callClaude(
  messages: Message[],
  system: string,
  apiKey: string,
  tools?: object[],
  onToolCall?: (
    name: string,
    input: Record<string, unknown>
  ) => Promise<{ result: string; data?: unknown }>
): Promise<{ text: string; toolData?: unknown }> {
  const claudeMessages = buildClaudeMessages(messages);
  const response = await rawClaudeCall(claudeMessages, system, apiKey, tools);

  if (response.stop_reason === "tool_use" && onToolCall) {
    const toolUseBlock = (response.content as Array<{ type: string; name: string; input: Record<string, unknown>; id: string }>)
      .find((b) => b.type === "tool_use");

    if (toolUseBlock) {
      const { result, data } = await onToolCall(toolUseBlock.name, toolUseBlock.input);

      // Follow-up call with tool result so Claude can write a natural reply
      const followUp = await rawClaudeCall(
        [
          ...claudeMessages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [{ type: "tool_result", tool_use_id: toolUseBlock.id, content: result }],
          },
        ],
        system,
        apiKey
      );

      const text =
        (followUp.content as Array<{ type: string; text?: string }>)
          .find((b) => b.type === "text")?.text ?? "";
      return { text, toolData: data };
    }
  }

  const text =
    (response.content as Array<{ type: string; text?: string }>)
      .find((b) => b.type === "text")?.text ?? "";
  return { text };
}

async function callGemini(
  messages: Message[],
  system: string,
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const contents = messages.map((m) => {
    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
    if (m.images) {
      for (const img of m.images) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
    }
    if (m.content) parts.push({ text: m.content });
    if (parts.length === 0) parts.push({ text: "" });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      systemInstruction: system,
      maxOutputTokens: 1024,
    },
  });
  return response.text ?? "";
}

export async function POST(request: NextRequest) {
  let body: {
    messages?: Message[];
    systemPrompt?: string;
    fileContext?: string;
    teamContext?: string;
    teamId?: string;
    provider?: "claude" | "gemini";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, systemPrompt, fileContext, teamContext, teamId, provider = "claude" } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages are required." }, { status: 400 });
  }

  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Gemini preview models don't support multimodal via API — force Claude for image requests
  const hasImages = messages.some((m: Message) => m.images && m.images.length > 0);
  const effectiveProvider = hasImages ? "claude" : provider;

  if (effectiveProvider === "gemini" && !geminiKey) {
    return NextResponse.json({ error: "Gemini is not configured yet. Add GEMINI_API_KEY to your environment." }, { status: 503 });
  }
  if (effectiveProvider === "claude" && !claudeKey) {
    return NextResponse.json({ error: "Claude is not configured yet. Add ANTHROPIC_API_KEY to your environment." }, { status: 503 });
  }

  // Build system prompt
  let system =
    systemPrompt ||
    "You are a helpful AI assistant embedded in the One&All team collaboration dashboard. Be concise, friendly, and practical. Format responses with markdown when helpful.";

  // Inject live team context (compact, pre-formatted client-side)
  if (teamContext) {
    system += `\n\n---\nLive team data (today: ${new Date().toISOString().split("T")[0]}):\n${teamContext}`;
  }

  // Inject persistent knowledge base
  if (teamId) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: kbItems } = await supabase
        .from("knowledge_base")
        .select("name, content")
        .eq("team_id", teamId);
      if (kbItems && kbItems.length > 0) {
        const kbText = kbItems.map((i) => `=== ${i.name} ===\n${i.content}`).join("\n\n");
        system += `\n\n---\nWorkspace knowledge base (use when relevant):\n\n${kbText}`;
      }
    } catch {
      // Non-fatal
    }
  }

  // Inject session-uploaded files
  if (fileContext) {
    system += `\n\n---\nAdditional session files:\n\n${fileContext}`;
  }

  try {
    if (effectiveProvider === "gemini") {
      const text = await callGemini(messages, system, geminiKey!);
      if (!text.trim()) throw new Error("The AI returned an empty response. Try again.");
      return NextResponse.json({ text, usedProvider: "gemini" });
    }

    // Claude — enable task creation tool when teamId is present
    const user = getAuthUser(request);
    const tools = teamId ? [CREATE_TASK_TOOL, CREATE_EVENT_TOOL] : undefined;

    const { text, toolData } = await callClaude(
      messages,
      system,
      claudeKey!,
      tools,
      teamId
        ? async (name, input) => {
            if (name === "create_task") {
              const supabase = getSupabaseAdmin();
              const userId = user?.id;
              const assigneeIds = input.assigneeId ? [input.assigneeId as string] : [];

              const { data: task, error } = await supabase
                .from("tasks")
                .insert({
                  team_id: teamId,
                  title: input.title,
                  description: (input.description as string) || null,
                  priority: ((input.priority as string) || "medium").toLowerCase(),
                  status: (input.status as string) || "todo",
                  assignee_id: assigneeIds[0] || null,
                  assignee_ids: assigneeIds.length > 0 ? assigneeIds : null,
                  project_id: (input.projectId as string) || null,
                  due_date: (input.dueDate as string) || null,
                  tags: (input.tags as string[]) || [],
                  created_by: userId || null,
                })
                .select()
                .single();

              if (error) {
                console.error("AI create_task error:", error);
                return { result: `Failed to create task: ${error.message}` };
              }

              if (userId) {
                await logActivity(teamId, userId, "created task", "task", task.id, {
                  title: task.title,
                }).catch(() => {});
              }

              return {
                result: `Task created: "${task.title}" (ID: ${task.id}, status: ${task.status}, priority: ${task.priority})`,
                data: {
                  createdTask: {
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    priority: task.priority,
                    dueDate: task.due_date,
                  },
                },
              };
            }
            if (name === "create_calendar_event") {
              const supabase = getSupabaseAdmin();
              const userId = user?.id;

              // Build end time — default 1 hour after start
              const startISO = input.startTime as string;
              const endISO = (input.endTime as string) ||
                new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString();

              const { data: event, error } = await supabase
                .from("events")
                .insert({
                  team_id: teamId,
                  title: input.title,
                  description: (input.description as string) || null,
                  type: (input.type as string) || "Meeting",
                  start_time: startISO,
                  end_time: endISO,
                  all_day: (input.allDay as boolean) || false,
                  location: (input.location as string) || null,
                  link: (input.link as string) || null,
                  color: (input.color as string) || "#3b82f6",
                  created_by: userId || null,
                })
                .select()
                .single();

              if (error) {
                console.error("AI create_calendar_event error:", error);
                return { result: `Failed to create event: ${error.message}` };
              }

              if (userId) {
                await logActivity(teamId, userId, "created event", "event", event.id, {
                  title: event.title,
                }).catch(() => {});
              }

              const date = (event.start_time as string)?.split("T")[0];
              const time = (event.start_time as string)?.split("T")[1]?.slice(0, 5);
              return {
                result: `Event created: "${event.title}" on ${date} at ${time} (ID: ${event.id})`,
                data: {
                  createdEvent: {
                    id: event.id,
                    title: event.title,
                    date,
                    startTime: event.start_time,
                    type: event.type,
                  },
                },
              };
            }

            return { result: "Unknown tool" };
          }
        : undefined
    );

    if (!text.trim() && !toolData) throw new Error("The AI returned an empty response. Try again.");
    return NextResponse.json({ text, toolData, usedProvider: "claude" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("AI error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
