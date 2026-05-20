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

interface EmployeeRow {
  id: string;
  profile_id: string;
  profiles?: { full_name?: string; email?: string } | null;
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

  // AI builder
  const [target, setTarget] = useState("employee");
  const [category, setCategory] = useState("Intake");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);

  // Send modal
  const [sendForm, setSendForm] = useState<FormItem | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
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
    const res = await fetch("/api/forms");
    const d = await res.json();
    setForms(Array.isArray(d) ? d : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (sendForm) {
      fetch("/api/employees").then((r) => r.json()).then((d) => setEmployees(Array.isArray(d) ? d : []));
      setSelectedEmp(new Set());
    }
  }, [sendForm]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setBuilderError(null);
    try {
      const res = await fetch("/api/ai/generate-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, target_role: target, category }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Generation failed");
      const schema = d.schema as FormSchema;
      setEditorForm({
        id: "",
        name: schema.title ?? "Untitled form",
        description: schema.description ?? null,
        schema,
        target_role: target,
        is_active: false,
      });
      setEditorSchema(schema);
      setEditorNew(true);
      setMessages([{ role: "ai", text: "I've drafted your form. Use the suggestions or ask me to change anything." }]);
      setPrompt("");
    } catch (e) {
      setBuilderError(e instanceof Error ? e.message : "Failed to generate form");
    } finally {
      setGenerating(false);
    }
  }

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

  async function handleSend() {
    if (!sendForm || selectedEmp.size === 0) return;
    setSending(true);
    try {
      const res = await fetch(`/api/forms/${sendForm.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: sendForm.id, employeeIds: Array.from(selectedEmp) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Send failed");
      setToast(`Sent to ${d.sent} employee${d.sent !== 1 ? "s" : ""}`);
      setSendForm(null);
      setTimeout(() => setToast(null), 2800);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to send");
      setTimeout(() => setToast(null), 2800);
    } finally {
      setSending(false);
    }
  }

  const suggestionChips = ["Add a medication section", "Make all fields required", "Add emergency contact"];

  return (
    <div className="max-w-5xl space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-navy text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>
      )}

      {/* AI builder */}
      <div className="bg-slateWash border border-slate/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-slate flex-shrink-0" />
          <div>
            <p className="text-[15px] font-medium text-ink">Create forms with Sola AI</p>
            <p className="text-[13px] text-muted">Describe what you need — built in seconds</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="bg-paper border border-line2 rounded-lg px-3 py-2 text-[13px] text-ink">
            <option value="employee">Employee</option>
            <option value="client">Client</option>
            <option value="all">All</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-paper border border-line2 rounded-lg px-3 py-2 text-[13px] text-ink">
            {["Intake", "Compliance", "Clinical", "Administrative", "Other"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the form you need..."
          className="w-full mt-3 bg-paper border border-line2 rounded-lg p-3 text-[13px] text-ink min-h-[80px] outline-none"
        />
        {builderError && <p className="text-[12px] text-danger-text mt-2">{builderError}</p>}
        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="mt-3 bg-slate text-white rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {generating && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>

      {/* Form list */}
      {loading ? (
        <p className="text-[13px] text-muted">Loading forms…</p>
      ) : forms.length === 0 ? (
        <div className="bg-paper border border-line2 rounded-xl p-8 text-center">
          <p className="text-[13px] text-muted">No forms yet. Use Sola AI above to create one.</p>
        </div>
      ) : (
        <div>
          {forms.map((f) => {
            const cat = (f.target_role === "client" ? "Clinical" : "Intake");
            return (
              <div key={f.id} className="bg-paper border border-line2 rounded-xl p-4 flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${CATEGORY_BG[cat] ?? "bg-paper2"}`}>
                  <FileText className="w-4 h-4 text-ink2" />
                </div>
                <button onClick={() => openEditor(f)} className="text-left min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink truncate">{f.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {f.is_active ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-success-bg text-success-text">Active</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-paper2 text-muted">Draft</span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slateWash text-slate capitalize">{f.target_role}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-paper2 text-muted">{f.submission_count ?? 0} submissions</span>
                  </div>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setSendForm(f)} className="bg-gold text-navy text-[12px] px-3 py-1.5 rounded-lg font-medium">Send</button>
                  <Link href={`/${role}/forms/${f.id}/submissions`} className="text-[12px] text-slate px-2 py-1.5">Submissions</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send modal */}
      {sendForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50" onClick={() => setSendForm(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-ink">Send form</h2>
              <button onClick={() => setSendForm(null)} className="text-muted"><X className="w-5 h-5" /></button>
            </div>
            <input readOnly value={sendForm.name} className="w-full bg-paper2 border border-line2 rounded-lg px-3 py-2 text-[13px] text-muted mb-4" />
            <p className="text-[12px] uppercase tracking-wide text-muted mb-2">Select employees</p>
            <div className="max-h-64 overflow-y-auto border border-line2 rounded-lg divide-y divide-line">
              {employees.length === 0 ? (
                <p className="text-[13px] text-muted p-3">No employees found.</p>
              ) : employees.map((e) => {
                const checked = selectedEmp.has(e.profile_id);
                return (
                  <label key={e.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedEmp((prev) => {
                          const next = new Set(prev);
                          if (next.has(e.profile_id)) next.delete(e.profile_id); else next.add(e.profile_id);
                          return next;
                        });
                      }}
                      style={{ accentColor: "#C9A84C" }}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink truncate">{e.profiles?.full_name ?? "—"}</p>
                      <p className="text-[12px] text-muted truncate">{e.profiles?.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <button
              onClick={handleSend}
              disabled={sending || selectedEmp.size === 0}
              className="w-full mt-4 bg-gold text-navy rounded-lg py-2.5 text-[13px] font-medium disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send form"}
            </button>
          </div>
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
