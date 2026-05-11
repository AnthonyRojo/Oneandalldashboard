import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured yet." }, { status: 503 });
  }

  let body: {
    messages?: { role: string; content: string }[];
    systemPrompt?: string;
    fileContext?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, systemPrompt, fileContext } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages are required." }, { status: 400 });
  }

  let system =
    systemPrompt ||
    "You are a helpful AI assistant embedded in the One&All team collaboration dashboard. Be concise, friendly, and practical. Format responses with markdown when it helps clarity.";

  if (fileContext) {
    system += `\n\n---\nThe user has uploaded the following files as context. Reference them when relevant:\n\n${fileContext}`;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
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
