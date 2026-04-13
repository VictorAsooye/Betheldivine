"use client";

import { useState } from "react";

export interface FormField {
  id: string;
  type: "text" | "textarea" | "select" | "multiselect" | "boolean" | "date" | "datetime" | "number" | "email" | "phone";
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormSchema {
  title: string;
  description?: string;
  fields: FormField[];
}

interface FormRendererProps {
  schema: FormSchema;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  submitting?: boolean;
  readOnly?: boolean;
  values?: Record<string, unknown>;
}

const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none";
const inputStyle = { borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#ffffff" };

export default function FormRenderer({ schema, onSubmit, submitting, readOnly, values }: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(values ?? {});

  function set(id: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, option: string) {
    const current = (formData[id] as string[]) ?? [];
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    set(id, next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit?.(formData);
  }

  const fields = schema.fields ?? [];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>
            {field.label}
            {field.required && !readOnly && <span className="ml-1" style={{ color: "#c0392b" }}>*</span>}
          </label>

          {field.type === "text" && (
            <input type="text" value={(formData[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              placeholder={field.placeholder} required={field.required} disabled={readOnly}
              className={inputCls} style={inputStyle} />
          )}

          {field.type === "email" && (
            <input type="email" value={(formData[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              placeholder={field.placeholder} required={field.required} disabled={readOnly}
              className={inputCls} style={inputStyle} />
          )}

          {field.type === "phone" && (
            <input type="tel" value={(formData[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              placeholder={field.placeholder ?? "(410) 555-0100"} required={field.required} disabled={readOnly}
              className={inputCls} style={inputStyle} />
          )}

          {field.type === "number" && (
            <input type="number" value={(formData[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              placeholder={field.placeholder} required={field.required} disabled={readOnly}
              className={inputCls} style={inputStyle} />
          )}

          {field.type === "date" && (
            <input type="date" value={(formData[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              required={field.required} disabled={readOnly}
              className={inputCls} style={inputStyle} />
          )}

          {field.type === "datetime" && (
            <input type="datetime-local" value={(formData[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              required={field.required} disabled={readOnly}
              className={inputCls} style={inputStyle} />
          )}

          {field.type === "textarea" && (
            <textarea value={(formData[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              placeholder={field.placeholder} required={field.required} disabled={readOnly}
              rows={3} className={inputCls} style={{ ...inputStyle, resize: "vertical" }} />
          )}

          {field.type === "select" && (
            <select value={(formData[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              required={field.required} disabled={readOnly}
              className={inputCls} style={inputStyle}>
              <option value="">Select…</option>
              {(field.options ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {field.type === "multiselect" && (
            <div className="space-y-2">
              {(field.options ?? []).map((opt) => {
                const selected = ((formData[field.id] as string[]) ?? []).includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selected}
                      onChange={() => toggleMulti(field.id, opt)}
                      disabled={readOnly}
                      className="rounded" />
                    <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {field.type === "boolean" && (
            <div className="flex gap-3">
              {["Yes", "No"].map((opt) => {
                const val = opt === "Yes";
                const selected = formData[field.id] === val;
                return (
                  <button key={opt} type="button"
                    onClick={() => !readOnly && set(field.id, val)}
                    className="px-5 py-2 rounded-lg text-sm font-semibold font-sans border transition-colors"
                    style={{
                      backgroundColor: selected ? "#1a2e4a" : "#ffffff",
                      color: selected ? "#ffffff" : "#1a2e4a",
                      borderColor: selected ? "#1a2e4a" : "#dce2ec",
                    }}>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {!readOnly && onSubmit && (
        <button type="submit" disabled={submitting}
          className="w-full py-3 rounded-lg text-white font-semibold font-sans text-sm disabled:opacity-60"
          style={{ backgroundColor: "#1a2e4a" }}>
          {submitting ? "Submitting…" : "Submit Form"}
        </button>
      )}
    </form>
  );
}
