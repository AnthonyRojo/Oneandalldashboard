import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/api-helpers";

type Message = { role: string; content: string };

async function callClaude(
  messages: Message[],
  system: string,
  apiKey: string
): Promise<string> {
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
      messages,
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
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function POST(request: NextRequest) {
  let body: {
    messages?: Message[];
    systemPrompt?: string;
    fileContext?: string;
    teamId?: string;
    provider?: "claude" | "gemini";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, systemPrompt, fileContext, teamId, provider = "claude" } = body;
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
    console.error("AI error:", err);
    return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 502 });
  }
}
