import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdmin } from "@/lib/api-helpers";

type AttachedImage = { data: string; mimeType: string };

type Message = {
  role: string;
  content: string;
  images?: AttachedImage[];
};

type ClaudeContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

async function callClaude(
  messages: Message[],
  system: string,
  apiKey: string
): Promise<string> {
  const claudeMessages = messages.map((m) => {
    if (m.images && m.images.length > 0) {
      const parts: ClaudeContent[] = m.images.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: img.mimeType, data: img.data },
      }));
      if (m.content) parts.push({ type: "text", text: m.content });
      return { role: m.role, content: parts };
    }
    return { role: m.role, content: m.content };
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: claudeMessages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
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

  if (provider === "gemini" && !geminiKey) {
    return NextResponse.json({ error: "Gemini is not configured yet. Add GEMINI_API_KEY to your environment." }, { status: 503 });
  }
  if (provider === "claude" && !claudeKey) {
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
    const text =
      provider === "gemini"
        ? await callGemini(messages, system, geminiKey!)
        : await callClaude(messages, system, claudeKey!);
    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("AI error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
