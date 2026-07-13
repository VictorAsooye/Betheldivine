"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles, Loader2, Camera, FileText, Copy, Check, FilePlus2 } from "lucide-react";
import { getGreeting, type Greeting } from "@/lib/greeting";

interface Citation {
  source_type: "document" | "form" | "license" | "submission";
  source_id: string;
  label: string;
}

interface FormAction {
  type: "created" | "updated";
  formId: string;
  formName: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  formAction?: FormAction;
}

type Role = "owner" | "admin" | "employee";

function sourceHref(role: Role, sourceType: Citation["source_type"]): string {
  const path =
    sourceType === "document" ? "documents" :
    sourceType === "license" ? "licenses" :
    "forms";
  return `/${role}/${path}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[11px] text-ink3 hover:text-ink transition"
      title="Copy"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }: { children?: React.ReactNode }) => <h3 className="text-[17px] font-semibold text-ink mt-4 mb-2 first:mt-0">{children}</h3>,
  h2: ({ children }: { children?: React.ReactNode }) => <h3 className="text-[16.5px] font-semibold text-ink mt-4 mb-2 first:mt-0">{children}</h3>,
  h3: ({ children }: { children?: React.ReactNode }) => <h4 className="text-[15.5px] font-semibold text-ink mt-3 mb-1.5 first:mt-0">{children}</h4>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-5 mb-3 space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-5 mb-3 space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-ink">{children}</strong>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-paper2 border border-line rounded px-1 py-0.5 text-[14px] font-mono text-ink">{children}</code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-paper2 border border-line rounded-lg p-3 text-[14px] font-mono text-ink overflow-x-auto mb-3">{children}</pre>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-sage underline hover:text-gold">{children}</a>
  ),
  hr: () => <hr className="border-line my-4" />,
};

interface SolaSupportChatProps {
  role: Role;
  lastFormHref?: string | null;
  lastFormLabel?: string;
  greetingName?: string;
}

export default function SolaSupportChat({ role, lastFormHref, lastFormLabel, greetingName }: SolaSupportChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const [greeting, setGreeting] = useState<Greeting | null>(null);
  useEffect(() => {
    if (greetingName) setGreeting(getGreeting(greetingName));
  }, [greetingName]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
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
        { role: "assistant", content: data.answer, citations: data.citations, formAction: data.formAction },
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
  const isHero = !!greetingName && !inConversation;
  const GreetingIcon = greeting?.icon;

  const inputForm = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ask(input);
      }}
      className={
        isHero
          ? "flex items-center gap-3 bg-paper border border-line2 rounded-2xl px-5 py-3.5 shadow-sm focus-within:border-gold transition"
          : "flex items-center gap-3 bg-paper border border-line2 rounded-2xl px-5 py-3.5 shadow-sm focus-within:border-gold transition"
      }
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
  );

  const shortcuts = !inConversation && (role !== "employee" || lastFormHref) && (
    <div className={isHero ? "flex items-center justify-center gap-3 mt-5 flex-wrap" : "mt-1"}>
      {role !== "employee" && (
        <Link
          href={`/${role}/documents/upload`}
          className={
            isHero
              ? "flex items-center gap-2 bg-paper border border-line2 rounded-full px-4 py-2 text-[13px] font-medium text-ink hover:border-gold transition"
              : "flex items-center gap-3 py-3.5 border-b border-line text-[13.5px] font-medium text-ink hover:text-navy transition"
          }
        >
          <Camera className="size-3.5 text-sage flex-shrink-0" />
          Scan a document
        </Link>
      )}
      {lastFormHref && (
        <Link
          href={lastFormHref}
          className={
            isHero
              ? "flex items-center gap-2 bg-paper border border-line2 rounded-full px-4 py-2 text-[13px] font-medium text-ink hover:border-gold transition"
              : "flex items-center gap-3 py-3.5 border-b border-line text-[13.5px] font-medium text-ink hover:text-navy transition"
          }
        >
          <FileText className="size-3.5 text-sage flex-shrink-0" />
          Fill out {lastFormLabel || "your last form"}
        </Link>
      )}
    </div>
  );

  if (isHero) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-10">
        <div className="w-full max-w-xl">
          {GreetingIcon && <GreetingIcon className="size-6 text-gold mb-3 mx-auto" />}
          <h1
            className="text-[32px] text-ink leading-tight text-balance"
            style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
          >
            {greeting?.line ?? " "}
          </h1>
          <p className="text-[14px] text-muted mt-1 mb-7">{greeting?.sub ?? " "}</p>
          {inputForm}
          {shortcuts}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      {inConversation && (
        <div className="space-y-7 pb-6">
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="bg-navy text-paper rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%] text-[16px] leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={i} className="group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-5 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                    <Sparkles className="size-2.5 text-gold" />
                  </div>
                  <span className="text-[12px] font-semibold text-ink">Sola</span>
                </div>
                <div className="text-[16px] text-ink2 pl-7">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {msg.formAction && (
                  <div className="pl-7 mt-2">
                    <Link
                      href={`/${role}/forms/${msg.formAction.formId}/fill`}
                      className="inline-flex items-center gap-2 bg-sageBg text-sage border border-sage/30 rounded-lg px-3 py-1.5 text-[12px] font-medium hover:border-gold hover:text-ink transition"
                    >
                      <FilePlus2 className="size-3.5" />
                      {msg.formAction.type === "created" ? "Created" : "Updated"} "{msg.formAction.formName}" — View form
                    </Link>
                  </div>
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pl-7">
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
                <div className="pl-7 mt-2 opacity-0 group-hover:opacity-100 transition">
                  <CopyButton text={msg.content} />
                </div>
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
      )}
      <div className={inConversation ? "sticky bottom-0 bg-paper2 pt-2 pb-2" : ""}>
        {inputForm}
        {shortcuts}
      </div>
    </div>
  );
}
