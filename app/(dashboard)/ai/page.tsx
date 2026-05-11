"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, RotateCcw, Copy, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Summarize what I should focus on today",
  "Help me write a team announcement",
  "How do I run an effective stand-up meeting?",
  "Draft a task description for a new feature",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md" style={{ color: "#9ca3af" }}>
      {copied ? <Check className="w-3.5 h-3.5" style={{ color: "#22c55e" }} /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
        style={{ background: isUser ? "#f59e0b" : "#111827", color: "white" }}>
        {isUser ? "You" : <Sparkles className="w-4 h-4" />}
      </div>
      <div className={`group relative max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: isUser ? "#f59e0b" : "white",
            color: isUser ? "white" : "#111827",
            borderBottomRightRadius: isUser ? 4 : undefined,
            borderBottomLeftRadius: isUser ? undefined : 4,
            border: isUser ? "none" : "1px solid #e5e7eb",
          }}>
          {msg.content}
        </div>
        {!isUser && <CopyButton text={msg.content} />}
      </div>
    </div>
  );
}

export default function AIPage() {
  const { currentUser } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setMessages([...newMessages, { role: "assistant", content: data.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get a response.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const reset = () => {
    setMessages([]);
    setError(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ background: "#fafaf7" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: "white", borderColor: "#e5e7eb" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#111827" }}>
            <Sparkles className="w-5 h-5" style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h1 className="font-semibold" style={{ color: "#111827" }}>AI Assistant</h1>
            <p style={{ color: "#6b7280", fontSize: "0.75rem" }}>Powered by Claude</p>
          </div>
        </div>
        {!isEmpty && (
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-colors hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#111827" }}>
                <Sparkles className="w-8 h-8" style={{ color: "#f59e0b" }} />
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "#111827" }}>
                Hello, {currentUser?.name?.split(" ")[0] ?? "there"}
              </h2>
              <p style={{ color: "#6b7280" }}>How can I help your team today?</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="px-4 py-3 rounded-2xl border text-sm text-left transition-all hover:shadow-md hover:border-amber-200"
                  style={{ background: "white", borderColor: "#e5e7eb", color: "#374151" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex flex-col gap-5">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "#111827" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "#f59e0b" }} />
                </div>
                <div className="px-4 py-3 rounded-2xl border" style={{ background: "white", borderColor: "#e5e7eb", borderBottomLeftRadius: 4 }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#9ca3af" }} />
                </div>
              </div>
            )}
            {error && (
              <div className="text-center">
                <p className="text-sm px-4 py-2 rounded-xl inline-block" style={{ background: "#fef2f2", color: "#ef4444" }}>{error}</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t" style={{ background: "white", borderColor: "#e5e7eb" }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 px-4 py-3 rounded-2xl border transition-all focus-within:border-amber-400"
            style={{ background: "#f9f9f6", borderColor: "#e5e7eb" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 resize-none outline-none bg-transparent text-sm leading-relaxed"
              style={{ color: "#111827", maxHeight: 160 }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              autoFocus
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: input.trim() && !loading ? "#f59e0b" : "#e5e7eb",
                color: input.trim() && !loading ? "white" : "#9ca3af",
              }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-center mt-2" style={{ color: "#9ca3af", fontSize: "0.7rem" }}>
            AI can make mistakes. Double-check important information.
          </p>
        </div>
      </div>
    </div>
  );
}
