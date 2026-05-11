import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured yet." }, { status: 503 });
  }

  let body: {
    messages?: { role: string; content: string }[];
    systemPrompt?: string;
    fileContext?: string;
    teamId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, systemPrompt, fileContext, teamId } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages are required." }, { status: 400 });
  }

  // Base system prompt from the selected agent
  let system =
    systemPrompt ||
    "You are a helpful AI assistant embedded in the One&All team collaboration dashboard. Be concise, friendly, and practical. Format responses with markdown when helpful.";

  // Fetch persistent knowledge base for this team
  let kbText = "";
  if (teamId) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: kbItems } = await supabase
        .from("knowledge_base")
        .select("name, content")
        .eq("team_id", teamId);

      if (kbItems && kbItems.length > 0) {
        kbText = kbItems
          .map((item) => `=== ${item.name} ===\n${item.content}`)
          .join("\n\n");
      }
    } catch {
      // Non-fatal — proceed without KB if fetch fails
    }
  }

  // Session-uploaded files (per-message context)
  const allContext = [kbText, fileContext].filter(Boolean).join("\n\n");
  if (allContext) {
    system += `\n\n---\nWorkspace context (use when relevant):\n\n${allContext}`;
  }

  // Use cache_control on system so Anthropic caches it between turns
  const response = await fetch("https://api.anthropic.com/v1/messages", {
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
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Anthropic API error:", err);
    return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 502 });
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text ?? "";
  return NextResponse.json({ text });
}
