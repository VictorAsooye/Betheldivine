"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { type FormSchema, type FormField } from "@/components/FormRenderer";

interface SavedForm {
  id: string;
  name: string;
  description?: string;
  schema: FormSchema;
  target_role: string;
  is_active: boolean;
  created_at: string;
  submission_count?: number;
  profiles?: { full_name?: string };
}

const DRAFT_KEY = "bethel_form_draft";

const CATEGORIES = ["Incident Report", "Medication Log", "Client Intake", "Compliance", "Other"];
const ROLES = [
  { value: "all", label: "Everyone" },
  { value: "employee", label: "Employees" },
  { value: "client", label: "Clients" },
];
const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "select", label: "Dropdown" },
  { value: "multiselect", label: "Multi-Select" },
  { value: "boolean", label: "Yes / No" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
];

const TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  text:        { bg: "#f0f4ff", color: "#1a2e4a" },
  textarea:    { bg: "#f0f4ff", color: "#1a2e4a" },
  select:      { bg: "#f7f0fa", color: "#7c3aed" },
  multiselect: { bg: "#f7f0fa", color: "#7c3aed" },
  boolean:     { bg: "#f0faf5", color: "#2d8a5e" },
  date:        { bg: "#fdf8ec", color: "#c8991a" },
  datetime:    { bg: "#fdf8ec", color: "#c8991a" },
  number:      { bg: "#fef2f2", color: "#c0392b" },
  email:       { bg: "#f0f4ff", color: "#1a6b7c" },
  phone:       { bg: "#f0f4ff", color: "#1a6b7c" },
};

function generateId() {
  return "field_" + Math.random().toString(36).slice(2, 9);
}

// ── useUndoHistory hook ───────────────────────────────────
function useUndoHistory<T>(initial: T | null) {
  const [history, setHistory] = useState<(T | null)[]>([initial]);
  const [index, setIndex] = useState(0);

  const current = history[index] ?? null;
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  const set = useCallback((next: T | null) => {
    setHistory((h) => {
      const trimmed = h.slice(0, index + 1);
      return [...trimmed, next];
    });
    setIndex((i) => i + 1);
  }, [index]);

  const undo = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  // Reset when externally cleared
  const reset = useCallback((value: T | null) => {
    setHistory([value]);
    setIndex(0);
  }, []);

  return { current, set, undo, redo, canUndo, canRedo, reset };
}

// ── FieldRow ──────────────────────────────────────────────
function FieldRow({
  field, index, total, onChange, onDelete, onMove,
}: {
  field: FormField;
  index: number;
  total: number;
  onChange: (updated: FormField) => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tc = TYPE_COLOR[field.type] ?? { bg: "#f7f9fc", color: "#8e9ab0" };
  const label = FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type;
  const needsOptions = field.type === "select" || field.type === "multiselect";
  const optionsStr = (field.options ?? []).join("\n");

  return (
    <div className="rounded-lg border" style={{ borderColor: expanded ? "#1a2e4a" : "#dce2ec", transition: "border-color 0.15s" }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button type="button" onClick={() => onMove("up")} disabled={index === 0}
            className="disabled:opacity-25" style={{ color: "#8e9ab0" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button type="button" onClick={() => onMove("down")} disabled={index === total - 1}
            className="disabled:opacity-25" style={{ color: "#8e9ab0" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>

        <span className="text-xs font-semibold font-sans px-2 py-0.5 rounded shrink-0"
          style={{ backgroundColor: tc.bg, color: tc.color }}>
          {label}
        </span>

        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          className="flex-1 text-sm font-sans bg-transparent outline-none border-b border-transparent focus:border-gray-300 py-0.5 min-w-0"
          style={{ color: "#1a2e4a" }}
          placeholder="Field label…"
        />

        <button type="button"
          onClick={() => onChange({ ...field, required: !field.required })}
          className="text-xs font-semibold font-sans px-2 py-0.5 rounded shrink-0"
          style={{
            backgroundColor: field.required ? "#fef2f2" : "#f7f9fc",
            color: field.required ? "#c0392b" : "#8e9ab0",
            border: `1px solid ${field.required ? "#fca5a5" : "#dce2ec"}`,
          }}>
          {field.required ? "req" : "opt"}
        </button>

        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1 rounded"
          style={{ color: expanded ? "#1a2e4a" : "#8e9ab0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <button type="button" onClick={onDelete} className="shrink-0 p-1 rounded" style={{ color: "#c0392b" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3" style={{ borderColor: "#dce2ec", backgroundColor: "#f7f9fc" }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold font-sans mb-1" style={{ color: "#8e9ab0" }}>Field Type</label>
              <select value={field.type}
                onChange={(e) => onChange({ ...field, type: e.target.value as FormField["type"], options: [] })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm font-sans outline-none"
                style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#ffffff" }}>
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold font-sans mb-1" style={{ color: "#8e9ab0" }}>Placeholder</label>
              <input type="text" value={field.placeholder ?? ""}
                onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
                placeholder="Optional hint text…"
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm font-sans outline-none"
                style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#ffffff" }} />
            </div>
          </div>
          {needsOptions && (
            <div>
              <label className="block text-xs font-semibold font-sans mb-1" style={{ color: "#8e9ab0" }}>
                Options <span className="font-normal">(one per line)</span>
              </label>
              <textarea value={optionsStr}
                onChange={(e) => onChange({ ...field, options: e.target.value.split("\n").filter(Boolean) })}
                rows={4}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm font-sans outline-none"
                style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#ffffff", resize: "vertical" }}
                placeholder={"Option A\nOption B\nOption C"} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
interface FormBuilderPageProps {
  role: "admin" | "owner";
}

export default function FormBuilderPage({ role }: FormBuilderPageProps) {
  const [prompt, setPrompt] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [category, setCategory] = useState("Other");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedForms, setSavedForms] = useState<SavedForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);

  const { current: schema, set: setSchema, undo, redo, canUndo, canRedo, reset } = useUndoHistory<FormSchema>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  // ── Restore draft on mount ──────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.schema) {
          reset(draft.schema);
          setHasDraft(true);
        }
        if (draft.prompt) setPrompt(draft.prompt);
        if (draft.targetRole) setTargetRole(draft.targetRole);
        if (draft.category) setCategory(draft.category);
        if (draft.savedAt) setDraftSavedAt(new Date(draft.savedAt));
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist draft on every change ──────────────────────
  useEffect(() => {
    if (!schema) return;
    try {
      const now = new Date();
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        schema,
        prompt,
        targetRole,
        category,
        savedAt: now.toISOString(),
      }));
      setDraftSavedAt(now);
      setHasDraft(true);
    } catch { /* ignore */ }
  }, [schema, prompt, targetRole, category]);

  // ── Load saved forms ────────────────────────────────────
  useEffect(() => {
    fetch("/api/forms")
      .then((r) => r.json())
      .then((d) => { setSavedForms(Array.isArray(d) ? d : []); setLoadingForms(false); });
  }, []);

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setDraftSavedAt(null);
    reset(null);
    setPrompt("");
  }

  // ── Generate ────────────────────────────────────────────
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenError(null);

    const res = await fetch("/api/ai/generate-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, target_role: targetRole, category }),
    });
    const data = await res.json();
    if (!res.ok) {
      setGenError(data.error ?? "Generation failed.");
    } else {
      setSchema(data.schema);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
    setGenerating(false);
  }

  // ── Schema mutations ────────────────────────────────────
  function updateSchema(next: FormSchema) {
    setSchema(next);
  }

  function updateField(index: number, updated: FormField) {
    if (!schema) return;
    const fields = [...schema.fields];
    fields[index] = updated;
    updateSchema({ ...schema, fields });
  }

  function deleteField(index: number) {
    if (!schema) return;
    updateSchema({ ...schema, fields: schema.fields.filter((_, i) => i !== index) });
  }

  function moveField(index: number, dir: "up" | "down") {
    if (!schema) return;
    const fields = [...schema.fields];
    const swap = dir === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= fields.length) return;
    [fields[index], fields[swap]] = [fields[swap], fields[index]];
    updateSchema({ ...schema, fields });
  }

  function addField() {
    if (!schema) return;
    const blank: FormField = { id: generateId(), type: "text", label: "New Field", required: false };
    updateSchema({ ...schema, fields: [...schema.fields, blank] });
  }

  // ── Save ────────────────────────────────────────────────
  async function handleSave() {
    if (!schema) return;
    setSaving(true);
    setSaveError(null);

    const res = await fetch("/api/forms/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: schema.title, description: schema.description, schema, target_role: targetRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSaveError(data.error ?? "Save failed.");
    } else {
      setSavedForms((prev) => [{ ...data, submission_count: 0 }, ...prev]);
      clearDraft();
    }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch("/api/forms/save", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (res.ok) setSavedForms((prev) => prev.map((f) => f.id === id ? { ...f, is_active: !current } : f));
  }

  function fmtTime(d: Date) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  const basePath = `/${role}/forms`;

  return (
    <div>
      <PageHeader title="AI Form Builder" subtitle="Generate healthcare forms with Claude AI, then edit before saving" />

      {/* Draft restore banner */}
      {hasDraft && schema && draftSavedAt && (
        <div className="mx-8 mt-6 px-4 py-3 rounded-lg flex items-center justify-between gap-4"
          style={{ backgroundColor: "#f0faf5", border: "1px solid #a7dfc4" }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d8a5e" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            <span className="text-sm font-sans font-semibold" style={{ color: "#2d8a5e" }}>
              Draft auto-saved at {fmtTime(draftSavedAt)}
            </span>
            <span className="text-sm font-sans" style={{ color: "#2d8a5e" }}>
              — your work is safe even if you switch tabs
            </span>
          </div>
          <button onClick={clearDraft}
            className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg border shrink-0"
            style={{ borderColor: "#a7dfc4", color: "#2d8a5e" }}>
            Discard Draft
          </button>
        </div>
      )}

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* LEFT: Generator */}
        <div className="space-y-6 sticky top-6">
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Generate a Form
            </h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>
                  Describe the form you need
                </label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
                  placeholder="e.g. A form for documenting a client incident, including what happened, when, who was involved, and what action was taken…"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
                  style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc", resize: "vertical" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Who submits this?</label>
                  <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
                    style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
                    style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {genError && <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{genError}</p>}
              <button type="submit" disabled={generating || !prompt.trim()}
                className="w-full py-2.5 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#c8991a" }}>
                {generating ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    Generating with Claude…
                  </>
                ) : schema ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    Regenerate
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    Generate Form
                  </>
                )}
              </button>
            </form>
          </div>

          {schema && (
            <p className="text-xs font-sans px-1" style={{ color: "#8e9ab0" }}>
              💡 Edit labels inline, reorder with ↑↓, change types via ⚙, toggle req/opt, add fields — then save when ready.
            </p>
          )}
        </div>

        {/* RIGHT: Editable preview */}
        <div ref={previewRef}>
          {schema ? (
            <div className="bg-white rounded-xl border" style={{ borderColor: "#dce2ec" }}>
              {/* Header */}
              <div className="px-6 py-4 border-b" style={{ borderColor: "#dce2ec" }}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#c8991a" }}>
                      Edit &amp; Preview
                    </span>
                    {/* Undo / Redo */}
                    <button type="button" onClick={undo} disabled={!canUndo} title="Undo (last change)"
                      className="ml-3 p-1.5 rounded disabled:opacity-30"
                      style={{ color: canUndo ? "#1a2e4a" : "#8e9ab0" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                      </svg>
                    </button>
                    <button type="button" onClick={redo} disabled={!canRedo} title="Redo"
                      className="p-1.5 rounded disabled:opacity-30"
                      style={{ color: canRedo ? "#1a2e4a" : "#8e9ab0" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                      </svg>
                    </button>
                  </div>
                  <button onClick={handleSave} disabled={saving}
                    className="px-5 py-2 rounded-lg text-white text-sm font-semibold font-sans shrink-0 disabled:opacity-60"
                    style={{ backgroundColor: "#1a2e4a" }}>
                    {saving ? "Saving…" : "Save Form"}
                  </button>
                </div>

                {/* Editable title */}
                <input type="text" value={schema.title}
                  onChange={(e) => updateSchema({ ...schema, title: e.target.value })}
                  className="w-full text-lg font-semibold bg-transparent outline-none border-b border-transparent focus:border-gray-300 pb-0.5 mb-2"
                  style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
                  placeholder="Form title…" />

                {/* Editable description */}
                <input type="text" value={schema.description ?? ""}
                  onChange={(e) => updateSchema({ ...schema, description: e.target.value })}
                  className="w-full text-sm bg-transparent outline-none border-b border-transparent focus:border-gray-300 pb-0.5"
                  style={{ color: "#8e9ab0" }}
                  placeholder="Description (optional)…" />
              </div>

              {/* Fields */}
              <div className="px-6 py-4 space-y-2">
                {(schema.fields ?? []).length === 0 && (
                  <p className="text-sm font-sans text-center py-4" style={{ color: "#8e9ab0" }}>No fields yet. Add one below.</p>
                )}
                {(schema.fields ?? []).map((field, i) => (
                  <FieldRow key={field.id} field={field} index={i} total={schema.fields.length}
                    onChange={(updated) => updateField(i, updated)}
                    onDelete={() => deleteField(i)}
                    onMove={(dir) => moveField(i, dir)} />
                ))}

                <button type="button" onClick={addField}
                  className="w-full py-2.5 rounded-lg border-2 border-dashed text-sm font-semibold font-sans flex items-center justify-center gap-2 mt-2 transition-colors"
                  style={{ borderColor: "#dce2ec", color: "#8e9ab0" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1a2e4a"; e.currentTarget.style.color = "#1a2e4a"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#dce2ec"; e.currentTarget.style.color = "#8e9ab0"; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Field
                </button>
              </div>

              {saveError && <div className="px-6 py-3 text-sm font-sans" style={{ color: "#c0392b" }}>{saveError}</div>}

              <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: "#dce2ec" }}>
                <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>
                  {(schema.fields ?? []).length} fields · {ROLES.find(r => r.value === targetRole)?.label} · {category}
                </p>
                <button onClick={handleSave} disabled={saving}
                  className="px-5 py-2 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-60"
                  style={{ backgroundColor: "#1a2e4a" }}>
                  {saving ? "Saving…" : "Save Form"}
                </button>
              </div>
            </div>
          ) : (
            <div className="min-h-64 flex items-center justify-center rounded-xl border border-dashed" style={{ borderColor: "#dce2ec" }}>
              <div className="text-center px-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dce2ec" strokeWidth="1.5" className="mx-auto mb-3">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
                  Describe a form and click Generate — then edit it here before saving
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Forms */}
      <div className="px-8 pb-8">
        <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
          Saved Forms
        </h2>
        {loadingForms ? (
          <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading forms…</p>
        ) : savedForms.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No forms saved yet. Generate your first form above.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #dce2ec", backgroundColor: "#f7f9fc" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Form Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Fields</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Target</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Submissions</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedForms.map((form, i) => (
                  <tr key={form.id} style={{ borderBottom: i < savedForms.length - 1 ? "1px solid #dce2ec" : "none" }}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>{form.name}</p>
                      {form.description && <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{form.description}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm font-sans" style={{ color: "#1a2e4a" }}>
                      {(form.schema?.fields ?? []).length}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold font-sans px-2 py-1 rounded-full capitalize"
                        style={{ backgroundColor: "#f0f4ff", color: "#1a2e4a" }}>
                        {ROLES.find(r => r.value === form.target_role)?.label ?? form.target_role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-sans" style={{ color: "#1a2e4a" }}>
                      <Link href={`${basePath}/${form.id}/submissions`} className="underline" style={{ color: "#1a2e4a" }}>
                        {form.submission_count ?? 0}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleActive(form.id, form.is_active)}
                        className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: form.is_active ? "#f0faf5" : "#f7f9fc",
                          color: form.is_active ? "#2d8a5e" : "#8e9ab0",
                          border: `1px solid ${form.is_active ? "#a7dfc4" : "#dce2ec"}`,
                        }}>
                        {form.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`${basePath}/${form.id}/submissions`}
                        className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}>
                        View Submissions
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
