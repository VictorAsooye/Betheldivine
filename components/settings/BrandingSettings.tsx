"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Branding {
  company_name: string;
  tagline: string;
  address: string;
  email: string;
  logo_storage_path: string;
  brand_color: string;
}

const EMPTY: Branding = {
  company_name: "Bethel Divine Healthcare",
  tagline: "",
  address: "",
  email: "",
  logo_storage_path: "",
  brand_color: "#0D1B2A",
};

const PRESETS = [
  { name: "Navy", color: "#0D1B2A" },
  { name: "Gold", color: "#C9A84C" },
  { name: "Slate", color: "#4A5A7A" },
  { name: "Emerald", color: "#059669" },
  { name: "Purple", color: "#7C3AED" },
  { name: "Crimson", color: "#DC2626" },
];

export default function BrandingSettings({ userId }: { userId: string }) {
  const [branding, setBranding] = useState<Branding>(EMPTY);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/settings/branding").then((r) => r.json()).then((d) => {
      if (d) {
        setBranding({ ...EMPTY, ...d });
        if (d.logo_storage_path) {
          const { data } = supabase.storage.from("branding").getPublicUrl(d.logo_storage_path);
          setLogoUrl(data.publicUrl);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof Branding>(key: K, value: Branding[K]) {
    setBranding((b) => ({ ...b, [key]: value }));
  }

  async function handleLogo(file: File) {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${userId}/logo.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) { setToast("Logo upload failed"); setTimeout(() => setToast(null), 2500); return; }
    set("logo_storage_path", path);
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    setLogoUrl(data.publicUrl + `?t=${Date.now()}`);
    await fetch("/api/settings/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo_storage_path: path }),
    });
    setToast("Logo updated");
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: branding.company_name,
        tagline: branding.tagline,
        address: branding.address,
        email: branding.email,
        brand_color: branding.brand_color,
      }),
    });
    setSaving(false);
    setToast(res.ok ? "Branding saved" : "Save failed");
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className="max-w-2xl space-y-4">
      {toast && <div className="fixed bottom-6 right-6 z-[60] bg-navy text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}

      {/* Logo */}
      <div className="bg-paper border border-line2 rounded-xl p-6">
        <h2 className="text-[14px] font-medium text-ink mb-3">Logo</h2>
        {logoUrl ? (
          <div className="flex items-center gap-4 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-line2 bg-paper2" />
            <button onClick={() => { setLogoUrl(null); set("logo_storage_path", ""); }} className="text-[12px] text-danger-text">Remove</button>
          </div>
        ) : null}
        <div onClick={() => fileRef.current?.click()} className="bg-paper2 border-2 border-dashed border-line2 rounded-xl p-8 text-center cursor-pointer">
          <Upload className="w-6 h-6 text-muted mx-auto mb-2" />
          <p className="text-[13px] text-muted">Upload logo</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogo(f); }} />
      </div>

      {/* Company info */}
      <div className="bg-paper border border-line2 rounded-xl p-6 space-y-4">
        <h2 className="text-[14px] font-medium text-ink">Company info</h2>
        {[
          { key: "company_name" as const, label: "Company name" },
          { key: "tagline" as const, label: "Tagline" },
          { key: "address" as const, label: "Address" },
          { key: "email" as const, label: "Company email" },
        ].map((f) => (
          <div key={f.key}>
            <label className="block text-[12px] font-medium text-ink2 mb-1">{f.label}</label>
            <input value={branding[f.key]} onChange={(e) => set(f.key, e.target.value)} className="w-full bg-paper2 border border-line2 rounded-lg px-3 py-2 text-[13px] outline-none" />
          </div>
        ))}
      </div>

      {/* Brand color */}
      <div className="bg-paper border border-line2 rounded-xl p-6">
        <h2 className="text-[14px] font-medium text-ink mb-3">Brand color</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.color}
              onClick={() => set("brand_color", p.color)}
              className={`w-10 h-10 rounded-full ${branding.brand_color === p.color ? "ring-2 ring-offset-2 ring-navy" : ""}`}
              style={{ backgroundColor: p.color }}
              title={p.name}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[13px] text-muted">#</span>
          <input
            value={branding.brand_color.replace("#", "")}
            onChange={(e) => set("brand_color", "#" + e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
            maxLength={6}
            className="w-28 bg-paper2 border border-line2 rounded-lg px-3 py-2 text-[13px] outline-none font-mono"
          />
        </div>
        {/* Live preview */}
        <div className="rounded-lg overflow-hidden border border-line2">
          <div className="px-4 py-3" style={{ backgroundColor: branding.brand_color }}>
            <p className="text-white text-[14px] font-medium">{branding.company_name || "Company Name"}</p>
          </div>
          <div className="p-4 bg-paper">
            <button className="text-white text-[13px] rounded px-4 py-2" style={{ backgroundColor: branding.brand_color }}>Submit</button>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="bg-gold text-navy font-medium px-6 py-2.5 rounded-lg text-[13px] disabled:opacity-50">
        {saving ? "Saving…" : "Save branding"}
      </button>
    </div>
  );
}
