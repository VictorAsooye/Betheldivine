"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, FileText, X, Send as SendIcon } from "lucide-react";
import FormRenderer, { type FormSchema } from "@/components/FormRenderer";

type Role = "admin" | "owner";

interface FormItem {
  id: string;
  name: string;
  description: string | null;
  schema: FormSchema;
  target_role: string;
  is_active: boolean;
  submission_count?: number;
}

interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

const CATEGORY_BG: Record<string, string> = {
  Intake: "bg-info-bg",
  Compliance: "bg-warning-bg",
  Clinical: "bg-success-bg",
  Administrative: "bg-slateWash",
  Other: "bg-paper2",
};

export default function FormsManager({ role }: { role: Role }) {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [carePlanCount, setCarePlanCount] = useState(0);

  // AI builder — collapsed by default so the tab opens on forms already on file
  const [category] = useState("Intake");

  const [toast, setToast] = useState<string | null>(null);

  // Editor modal
  const [editorForm, setEditorForm] = useState<FormItem | null>(null);
  const [editorSchema, setEditorSchema] = useState<FormSchema | null>(null);
  const [editorNew, setEditorNew] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [formsRes, carePlanRes] = await Promise.all([
      fetch("/api/forms"),
      fetch("/api/static-forms?form_type=client_care_plan"),
    ]);
    const d = await formsRes.json();
    setForms(Array.isArray(d) ? d : []);
    const carePlanSubs = await carePlanRes.json();
    setCarePlanCount(Array.isArray(carePlanSubs) ? carePlanSubs.length : 0);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openEditor(form: FormItem) {
    setEditorForm(form);
    setEditorSchema(form.schema);
    setEditorNew(false);
    setMessages([{ role: "ai", text: "Tell me what to change about this form and I'll update it." }]);
  }

  function closeEditor() {
    setEditorForm(null);
    setEditorSchema(null);
    setMessages([]);
    setChatInput("");
  }

  async function handleSaveForm() {
    if (!editorForm || !editorSchema) return;
    setSavingForm(true);
    try {
      if (editorNew || !editorForm.id) {
        const res = await fetch("/api/forms/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editorSchema.title ?? editorForm.name,
            description: editorSchema.description ?? null,
            schema: editorSchema,
            target_role: editorForm.target_role,
          }),
        });
        if (!res.ok) throw new Error("Save failed");
      } else {
        const res = await fetch("/api/forms/save", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editorForm.id,
            name: editorSchema.title ?? editorForm.name,
            description: editorSchema.description ?? null,
            schema: editorSchema,
            is_active: true,
          }),
        });
        if (!res.ok) throw new Error("Save failed");
      }
      closeEditor();
      await load();
      setToast("Form saved");
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast("Could not save form");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSavingForm(false);
    }
  }

  async function sendChat(message: string) {
    if (!message.trim() || !editorSchema) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const res = await fetch("/api/ai/generate-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: message,
          mode: "edit",
          currentSchema: editorSchema,
          targetRole: editorForm?.target_role,
          category,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Edit failed");
      setEditorSchema(d.schema as FormSchema);
      setMessages((m) => [...m, { role: "ai", text: "Form updated." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: e instanceof Error ? e.message : "Sorry, that didn't work." }]);
    } finally {
      setChatBusy(false);
    }
  }

  const suggestionChips = ["Add a medication section", "Make all fields required", "Add emergency contact"];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-navy text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>
      )}

      {/* AI builder — collapsed behind a toggle so the tab opens on forms on file */}
      <p className="text-[12px] text-muted">
        Need a new form? Ask Sola on the <Link href={`/${role}`} className="text-sage hover:text-gold underline">home page</Link> to build it for you.
      </p>

      {/* Search */}
      {forms.length > 0 && (
        <div className="flex items-center gap-3 border-b-[1.5px] border-ink pb-2 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms…"
            className="flex-1 text-[14px] bg-transparent text-ink placeholder:text-ink3 focus:outline-none"
          />
        </div>
      )}

      {/* Form list */}
      {loading ? (
        <p className="text-[13px] text-muted">Loading forms…</p>
      ) : (
        <div>
          {!"client care plan".includes(search.toLowerCase()) ? null : (
            <div className="flex items-center gap-3 py-3.5 border-b border-line">
              <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 bg-success-bg">
                <FileText className="w-4 h-4 text-ink2" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-[14px] font-medium text-ink truncate">Client Care Plan</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sageBg text-sage">Active</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slateWash text-slate">client</span>
                  <span className="text-[10px] text-muted">{carePlanCount} submission{carePlanCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <Link href={`/${role}/forms/client-care-plan`} className="text-[12px] font-semibold text-sage hover:text-gold transition">New</Link>
                <Link href={`/${role}/forms/client-care-plan/submissions`} className="text-[12px] text-muted hover:text-ink transition">Submissions</Link>
              </div>
            </div>
          )}
          {forms.length === 0 && !"client care plan".includes(search.toLowerCase()) && (
            <div className="bg-paper border border-line2 rounded-xl p-8 text-center">
              <p className="text-[13px] text-muted">No forms yet. Use &quot;Create a new form&quot; above to get started.</p>
            </div>
          )}
          {forms
            .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
            .map((f) => {
              const cat = "Intake";
              return (
                <div key={f.id} className="flex items-center gap-3 py-3.5 border-b border-line">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${CATEGORY_BG[cat] ?? "bg-paper2"}`}>
                    <FileText className="w-4 h-4 text-ink2" />
                  </div>
                  <button onClick={() => openEditor(f)} className="text-left min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink truncate">{f.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {f.is_active ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sageBg text-sage">Active</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-paper2 text-muted">Draft</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slateWash text-slate capitalize">{f.target_role}</span>
                      <span className="text-[10px] text-muted">{f.submission_count ?? 0} submissions</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <Link href={`/${role}/forms/${f.id}/fill`} className="text-[12px] font-semibold text-sage hover:text-gold transition">New</Link>
                    <Link href={`/${role}/forms/${f.id}/submissions`} className="text-[12px] text-muted hover:text-ink transition">Submissions</Link>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Editor modal */}
      {editorForm && editorSchema && (
        <div className="fixed inset-0 z-50 flex bg-paper2">
          <button onClick={closeEditor} className="absolute top-4 right-4 z-10 text-muted hover:text-ink p-2"><X className="w-5 h-5" /></button>

          {/* Left preview panel */}
          <div className="w-full md:w-[60%] bg-white border-r border-line p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] text-muted">Form preview</p>
              <button onClick={handleSaveForm} disabled={savingForm} className="bg-navy text-white rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-50">
                {savingForm ? "Saving…" : "Save form"}
              </button>
            </div>

            {/* Branded header */}
            <div className="bg-navy px-6 py-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy border border-gold flex items-center justify-center" style={{ fontFamily: "Georgia, serif" }}>
                  <span className="text-gold font-bold">B</span>
                </div>
                <div>
                  <p className="text-white font-medium text-[14px]">Bethel Divine Healthcare</p>
                  <p className="text-white/60 text-[12px]">Compassionate home health care</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-white/60 text-[11px]">Maryland</p>
                <p className="text-white/60 text-[11px]">info@betheldivine.com</p>
              </div>
            </div>
            <div className="bg-gold px-4 py-2">
              <p className="text-navy text-[14px] font-semibold">{editorSchema.title}</p>
            </div>

            <div className="border border-line border-t-0 rounded-b-lg overflow-hidden">
              <FormRenderer schema={editorSchema} readOnly />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted mt-3">
              <span>Bethel Divine Healthcare</span>
              <span>{editorForm.id ? `Form ${editorForm.id.substring(0, 8)} · ` : ""}Powered by Sola</span>
            </div>
          </div>

          {/* Right AI rail */}
          <div className="hidden md:flex w-[40%] bg-slateWash flex-col">
            <div className="p-4 border-b border-slate/10 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-slate" />
              <div>
                <p className="text-slate font-medium text-[14px]">Sola AI</p>
                <p className="text-muted text-[12px]">Form assistant</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "ai" ? "bg-white rounded-lg p-3 text-[13px] text-ink2" : "bg-slate text-white rounded-lg p-3 text-[13px] ml-8"}>
                  {m.text}
                </div>
              ))}
              {chatBusy && <div className="bg-white rounded-lg p-3 text-[13px] text-muted">Sola is thinking…</div>}
            </div>
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {suggestionChips.map((c) => (
                <button key={c} onClick={() => sendChat(c)} className="bg-white border border-line rounded-full px-3 py-1.5 text-[12px] text-slate">{c}</button>
              ))}
            </div>
            <div className="p-4">
              <div className="bg-white border border-line rounded-lg flex items-end gap-2 p-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
                  placeholder="Ask Sola to change the form…"
                  className="flex-1 text-[13px] outline-none resize-none max-h-24 text-ink"
                  rows={1}
                />
                <button onClick={() => sendChat(chatInput)} disabled={chatBusy} className="bg-slate text-white rounded-lg p-2 disabled:opacity-50">
                  <SendIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
