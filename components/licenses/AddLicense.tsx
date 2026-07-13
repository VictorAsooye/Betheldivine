"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, PenLine, Check } from "lucide-react";

type Role = "admin" | "owner";
type Mode = null | "photo" | "file" | "manual";

interface EmployeeRow {
  id: string;
  profile_id: string;
  profiles?: { full_name?: string } | null;
}

interface FormState {
  license_name: string;
  license_number: string;
  issuing_authority: string;
  issued_date: string;
  expiry_date: string;
  holder_id: string;
}

const EMPTY: FormState = {
  license_name: "",
  license_number: "",
  issuing_authority: "",
  issued_date: "",
  expiry_date: "",
  holder_id: "",
};

const ORG = "__organization__";

function fmt(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function offsetDate(expiry: string, days: number) {
  const d = new Date(expiry);
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AddLicense({ role }: { role: Role }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [scanning, setScanning] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [aiFields, setAiFields] = useState<Set<keyof FormState>>(new Set());
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then((d) => setEmployees(Array.isArray(d) ? d : []));
  }, []);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleScan(file: File) {
    setScanning(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/ai/scan-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Scan failed");
      const filled = new Set<keyof FormState>();
      const next = { ...EMPTY };
      if (d.license_name) { next.license_name = d.license_name; filled.add("license_name"); }
      if (d.license_number) { next.license_number = d.license_number; filled.add("license_number"); }
      if (d.issuing_authority) { next.issuing_authority = d.issuing_authority; filled.add("issuing_authority"); }
      if (d.expiry_date) { next.expiry_date = d.expiry_date; filled.add("expiry_date"); }
      setForm(next);
      setAiFields(filled);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!form.license_name || !form.expiry_date || !form.holder_id) {
      setError("License name, expiry date, and assignee are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let holderId = form.holder_id;
      let holderType = "employee";
      if (form.holder_id === ORG) {
        const meRes = await fetch("/api/auth/me");
        const me = await meRes.json();
        holderId = me?.id ?? "";
        holderType = "organization";
      }
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holder_id: holderId,
          holder_type: holderType,
          license_name: form.license_name,
          license_number: form.license_number,
          issuing_authority: form.issuing_authority,
          issued_date: form.issued_date || null,
          expiry_date: form.expiry_date,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to save");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-10">
        <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-success-text" />
        </div>
        <h2 className="text-[18px] font-semibold text-ink">{form.license_name} saved</h2>
        <p className="text-[13px] text-muted mt-1">Renewal alerts are scheduled:</p>
        <div className="bg-paper border border-line2 rounded-xl p-4 mt-4 text-left space-y-2">
          {[
            { label: "90 days before", date: offsetDate(form.expiry_date, 90) },
            { label: "30 days before", date: offsetDate(form.expiry_date, 30) },
            { label: "14 days before", date: offsetDate(form.expiry_date, 14) },
            { label: "Expiry", date: fmt(form.expiry_date) },
          ].map((a) => (
            <div key={a.label} className="flex justify-between text-[13px]">
              <span className="text-muted">{a.label}</span>
              <span className="text-ink2">{a.date}</span>
            </div>
          ))}
        </div>
        <button onClick={() => router.push(`/${role}/licenses`)} className="mt-5 bg-navy text-white rounded-lg px-5 py-2.5 text-[13px] font-medium">
          Back to licenses
        </button>
      </div>
    );
  }

  const aiBadge = (field: keyof FormState) =>
    aiFields.has(field) ? <span className="ml-2 text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded">AI</span> : null;

  const showForm = mode === "manual" || ((mode === "photo" || mode === "file") && !scanning && aiFields.size > 0);

  return (
    <div className="w-full max-w-3xl space-y-5">
      {scanning && (
        <div className="fixed inset-0 z-50 bg-navy/80 flex flex-col items-center justify-center gap-4">
          <span className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="text-white text-[15px]">Scanning document…</p>
        </div>
      )}

      {/* Option cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: "photo" as const, Icon: Camera, title: "Take a photo", sub: "Scan a license with your camera" },
          { key: "file" as const, Icon: Upload, title: "Upload a file", sub: "PDF or image — Sola reads it" },
          { key: "manual" as const, Icon: PenLine, title: "Enter manually", sub: "Type the details yourself" },
        ].map((opt) => {
          const Icon = opt.Icon;
          return (
            <button
              key={opt.key}
              onClick={() => {
                setError(null);
                if (opt.key === "photo") photoInput.current?.click();
                else if (opt.key === "file") fileInput.current?.click();
                setMode(opt.key);
                if (opt.key === "manual") { setForm(EMPTY); setAiFields(new Set()); }
              }}
              className={`bg-paper border-2 rounded-2xl p-6 text-center transition ${mode === opt.key ? "border-navy" : "border-line2 hover:border-navy"}`}
            >
              <Icon className="w-7 h-7 text-navy mx-auto mb-2" />
              <p className="text-[15px] font-medium text-ink">{opt.title}</p>
              <p className="text-[13px] text-muted mt-1">{opt.sub}</p>
            </button>
          );
        })}
      </div>

      <input ref={photoInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScan(f); }} />
      <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScan(f); }} />

      {error && <p className="text-[13px] text-danger-text">{error}</p>}

      {showForm && (
        <div className="bg-paper border border-line2 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-ink2 mb-1">License name {aiBadge("license_name")}</label>
            <input value={form.license_name} onChange={(e) => set("license_name", e.target.value)} className="w-full bg-paper2 border border-line2 rounded-lg px-3 py-2 text-[13px] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-ink2 mb-1">License number {aiBadge("license_number")}</label>
              <input value={form.license_number} onChange={(e) => set("license_number", e.target.value)} className="w-full bg-paper2 border border-line2 rounded-lg px-3 py-2 text-[13px] outline-none" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink2 mb-1">Issuing authority {aiBadge("issuing_authority")}</label>
              <input value={form.issuing_authority} onChange={(e) => set("issuing_authority", e.target.value)} className="w-full bg-paper2 border border-line2 rounded-lg px-3 py-2 text-[13px] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-ink2 mb-1">Issue date</label>
              <input type="date" value={form.issued_date} onChange={(e) => set("issued_date", e.target.value)} className="w-full bg-paper2 border border-line2 rounded-lg px-3 py-2 text-[13px] outline-none" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink2 mb-1">Expiry date {aiBadge("expiry_date")}</label>
              <input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} className={`w-full bg-paper2 rounded-lg px-3 py-2 text-[13px] outline-none border ${aiFields.has("expiry_date") ? "border-warning-border" : "border-line2"}`} />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink2 mb-1">Assign to</label>
            <select value={form.holder_id} onChange={(e) => set("holder_id", e.target.value)} className="w-full bg-paper2 border border-line2 rounded-lg px-3 py-2 text-[13px] outline-none">
              <option value="">Select…</option>
              <option value={ORG}>Organization</option>
              {employees.map((e) => (
                <option key={e.id} value={e.profile_id}>{e.profiles?.full_name ?? e.profile_id}</option>
              ))}
            </select>
          </div>
          <button onClick={handleSave} disabled={saving} className="bg-gold text-navy font-medium px-6 py-2.5 rounded-lg text-[13px] disabled:opacity-50">
            {saving ? "Saving…" : "Confirm & save"}
          </button>
        </div>
      )}
    </div>
  );
}
