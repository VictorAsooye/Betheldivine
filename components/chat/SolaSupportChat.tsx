"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, Sparkles, Loader2, Camera, FileText, Clock } from "lucide-react";

interface Citation {
  source_type: "document" | "form" | "license";
  source_id: string;
  label: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

type Role = "owner" | "admin" | "employee";

function sourceHref(role: Role, sourceType: Citation["source_type"]): string {
  const path = sourceType === "document" ? "documents" : sourceType === "form" ? "forms" : "licenses";
  return `/${role}/${path}`;
}

interface SolaSupportChatProps {
  role: Role;
  lastFormHref?: string | null;
  lastFormLabel?: string;
}

export default function SolaSupportChat({ role, lastFormHref, lastFormLabel }: SolaSupportChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Something went wrong. Try again." },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, citations: data.citations },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong reaching Sola. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-paper border border-line2 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-7 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
          <Sparkles className="size-3.5 text-gold" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink">Sola Support</p>
          <p className="text-[11px] text-muted">Ask me anything about your business</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {role !== "employee" && (
            <Link
              href={`/${role}/documents/upload`}
              className="flex flex-col items-center justify-center gap-1.5 text-center bg-paper2 border border-line rounded-lg px-3 py-4 hover:border-gold transition"
            >
              <Camera className="size-4 text-ink2" />
              <span className="text-[12px] font-medium text-ink2">Scan a document</span>
            </Link>
          )}
          {lastFormHref && (
            <Link
              href={lastFormHref}
              className="flex flex-col items-center justify-center gap-1.5 text-center bg-paper2 border border-line rounded-lg px-3 py-4 hover:border-gold transition"
            >
              <FileText className="size-4 text-ink2" />
              <span className="text-[12px] font-medium text-ink2">
                Fill out {lastFormLabel || "your last form"}
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => ask("What's expiring soon?")}
            className="flex flex-col items-center justify-center gap-1.5 text-center bg-paper2 border border-line rounded-lg px-3 py-4 hover:border-gold transition"
          >
            <Clock className="size-4 text-ink2" />
            <span className="text-[12px] font-medium text-ink2">What&apos;s expiring soon?</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto mb-3 pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  msg.role === "user"
                    ? "bg-navy text-paper rounded-xl rounded-br-sm px-3 py-2 max-w-[85%] text-[13px]"
                    : "bg-paper2 border border-line rounded-xl rounded-bl-sm px-3 py-2 max-w-[85%]"
                }
              >
                <p className={msg.role === "user" ? "text-[13px]" : "text-[13px] text-ink2 whitespace-pre-wrap"}>
                  {msg.content}
                </p>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.citations.map((citation) => (
                      <Link
                        key={`${citation.source_type}:${citation.source_id}`}
                        href={sourceHref(role, citation.source_type)}
                        className="text-[11px] bg-slateWash text-slate rounded-full px-2 py-0.5 hover:bg-gold hover:text-navy transition"
                      >
                        {citation.source_type}: {citation.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-paper2 border border-line rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                <Loader2 className="size-3.5 text-muted animate-spin" />
                <span className="text-[12px] text-muted">Sola is thinking…</span>
              </div>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 mt-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your forms, licenses, or documents…"
          disabled={loading}
          className="flex-1 text-[13px] bg-paper2 border border-line rounded-lg px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-gold transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="size-9 flex-shrink-0 flex items-center justify-center bg-navy rounded-lg text-gold disabled:opacity-40 hover:bg-navy-mid transition"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
