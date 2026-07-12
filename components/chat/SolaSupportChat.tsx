"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, Sparkles, Loader2, Camera, FileText, ArrowRight } from "lucide-react";

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

  const inConversation = messages.length > 0;

  return (
    <div className="max-w-xl">
      {inConversation ? (
        <div className="space-y-5 max-h-[28rem] overflow-y-auto mb-4 pr-1">
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="bg-navy text-paper rounded-xl rounded-br-sm px-3.5 py-2.5 max-w-[80%] text-[13px]">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="size-5 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                    <Sparkles className="size-2.5 text-gold" />
                  </div>
                  <span className="text-[12px] font-semibold text-ink">Sola</span>
                </div>
                <p className="text-[13px] text-ink2 whitespace-pre-wrap pl-7">{msg.content}</p>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pl-7">
                    {msg.citations.map((citation) => (
                      <Link
                        key={`${citation.source_type}:${citation.source_id}`}
                        href={sourceHref(role, citation.source_type)}
                        className="text-[11px] text-sage border border-line rounded-full px-2.5 py-0.5 hover:border-gold hover:text-ink transition"
                      >
                        {citation.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
          {loading && (
            <div className="flex items-center gap-2 pl-7">
              <Loader2 className="size-3.5 text-muted animate-spin" />
              <span className="text-[12px] text-muted">Sola is thinking…</span>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-3 border-b-[1.5px] border-ink pb-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={inConversation ? "Ask a follow-up…" : "Ask Sola anything about your business…"}
          disabled={loading}
          className="flex-1 text-[15px] bg-transparent text-ink placeholder:text-ink3 placeholder:italic focus:outline-none"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="size-8 flex-shrink-0 flex items-center justify-center bg-gold rounded-full text-navy disabled:opacity-40 transition"
        >
          <Send className="size-3.5" />
        </button>
      </form>

      {!inConversation && (
        <div className="mt-1">
          {role !== "employee" && (
            <Link
              href={`/${role}/documents/upload`}
              className="flex items-center gap-3 py-3.5 border-b border-line text-[13.5px] font-medium text-ink hover:text-navy transition"
            >
              <Camera className="size-4 text-sage flex-shrink-0" />
              Scan a document
              <ArrowRight className="size-3.5 text-muted ml-auto flex-shrink-0" />
            </Link>
          )}
          {lastFormHref && (
            <Link
              href={lastFormHref}
              className="flex items-center gap-3 py-3.5 border-b border-line text-[13.5px] font-medium text-ink hover:text-navy transition"
            >
              <FileText className="size-4 text-sage flex-shrink-0" />
              Fill out {lastFormLabel || "your last form"}
              <ArrowRight className="size-3.5 text-muted ml-auto flex-shrink-0" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
