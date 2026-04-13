"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

interface SettingsState {
  org_name: string;
  org_address: string;
  org_phone: string;
  org_email: string;
  evv_enabled: boolean;
  require_geolocation: boolean;
  shift_reminder_hours: string;
  time_off_notice_days: string;
  medication_alerts: boolean;
  missed_shift_alerts: boolean;
}

const DEFAULT: SettingsState = {
  org_name: "Bethel Divine Healthcare Services LLC",
  org_address: "",
  org_phone: "",
  org_email: "",
  evv_enabled: true,
  require_geolocation: true,
  shift_reminder_hours: "2",
  time_off_notice_days: "3",
  medication_alerts: true,
  missed_shift_alerts: true,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
      <h2 className="text-base font-semibold mb-5" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>{label}</label>
      {hint && <p className="text-xs font-sans mb-1.5" style={{ color: "#8e9ab0" }}>{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        style={{ backgroundColor: checked ? "#1a2e4a" : "#dce2ec" }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qbConnected, setQbConnected] = useState(false);
  const [qbRealmId, setQbRealmId] = useState<string | null>(null);
  const [qbError, setQbError] = useState<string | null>(null);
  const [stripeActive] = useState(
    !!(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes("your_"))
  );
  const [resendActive, setResendActive] = useState<boolean | null>(null);

  const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none";
  const inputStyle = { borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" };

  useEffect(() => {
    // Check QB connect status and URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get("qb_connected") === "1") setQbConnected(true);
    if (params.get("qb_error")) setQbError(decodeURIComponent(params.get("qb_error")!));

    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setSettings({
          org_name: data.org_name ?? DEFAULT.org_name,
          org_address: data.org_address ?? DEFAULT.org_address,
          org_phone: data.org_phone ?? DEFAULT.org_phone,
          org_email: data.org_email ?? DEFAULT.org_email,
          evv_enabled: data.evv_enabled ?? DEFAULT.evv_enabled,
          require_geolocation: data.require_geolocation ?? DEFAULT.require_geolocation,
          shift_reminder_hours: data.shift_reminder_hours ?? DEFAULT.shift_reminder_hours,
          time_off_notice_days: data.time_off_notice_days ?? DEFAULT.time_off_notice_days,
          medication_alerts: data.medication_alerts ?? DEFAULT.medication_alerts,
          missed_shift_alerts: data.missed_shift_alerts ?? DEFAULT.missed_shift_alerts,
        });
      });

    // Check QB connection status
    fetch("/api/quickbooks/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) {
          setQbConnected(true);
          setQbRealmId(data.realm_id ?? null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Check Resend status
    fetch("/api/admin/integrations/status")
      .then((r) => r.json())
      .then((data) => setResendActive(data.resend ?? false))
      .catch(() => setResendActive(false));
  }, []);

  function set(key: keyof SettingsState, value: string | boolean) {
    setSaved(false);
    setError(null);
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save settings.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Settings" subtitle="Infrastructure and system configuration" />
        <div className="p-8 text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading settings…</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Infrastructure and system configuration" />

      <form onSubmit={handleSave}>
        <div className="p-8 space-y-6 max-w-3xl">

          <Section title="Organization">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Organization Name">
                <input type="text" value={settings.org_name} onChange={(e) => set("org_name", e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Primary Email">
                <input type="email" value={settings.org_email} onChange={(e) => set("org_email", e.target.value)}
                  placeholder="admin@betheldivinehcs.com" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Phone Number">
                <input type="tel" value={settings.org_phone} onChange={(e) => set("org_phone", e.target.value)}
                  placeholder="(410) 555-0100" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Address">
                <input type="text" value={settings.org_address} onChange={(e) => set("org_address", e.target.value)}
                  placeholder="123 Main St, Baltimore, MD 21201" className={inputCls} style={inputStyle} />
              </Field>
            </div>
          </Section>

          <Section title="EVV & Compliance">
            <Toggle checked={settings.evv_enabled} onChange={(v) => set("evv_enabled", v)}
              label="Enable EVV (Electronic Visit Verification)" />
            <Toggle checked={settings.require_geolocation} onChange={(v) => set("require_geolocation", v)}
              label="Require geolocation on clock in/out" />
            <div className="pt-1 border-t" style={{ borderColor: "#dce2ec" }} />
            <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>
              EVV captures GPS coordinates and timestamps when employees clock in and out. Required for Medicaid billing in Maryland.
            </p>
          </Section>

          <Section title="Scheduling">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Shift Reminder (hours before)" hint="Employees receive a reminder this many hours before a shift.">
                <select value={settings.shift_reminder_hours} onChange={(e) => set("shift_reminder_hours", e.target.value)}
                  className={inputCls} style={inputStyle}>
                  {["1", "2", "4", "8", "12", "24"].map((h) => (
                    <option key={h} value={h}>{h} hour{h !== "1" ? "s" : ""}</option>
                  ))}
                </select>
              </Field>
              <Field label="Time-Off Notice (minimum days)" hint="Minimum days ahead an employee must submit a time-off request.">
                <select value={settings.time_off_notice_days} onChange={(e) => set("time_off_notice_days", e.target.value)}
                  className={inputCls} style={inputStyle}>
                  {["1", "2", "3", "5", "7", "14"].map((d) => (
                    <option key={d} value={d}>{d} day{d !== "1" ? "s" : ""}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Alerts & Notifications">
            <Toggle checked={settings.medication_alerts} onChange={(v) => set("medication_alerts", v)}
              label="Alert owner when medication log is missed" />
            <Toggle checked={settings.missed_shift_alerts} onChange={(v) => set("missed_shift_alerts", v)}
              label="Alert owner when a shift is not clocked in" />
          </Section>

          <Section title="Integrations">
            <div className="space-y-4">

              {/* Stripe */}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>Stripe Payments</span>
                <span
                  className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                  style={stripeActive
                    ? { color: "#2d8a5e", backgroundColor: "#f0faf5" }
                    : { color: "#c8991a", backgroundColor: "#fdf8ec" }}
                >
                  {stripeActive ? "Connected" : "Not Configured"}
                </span>
              </div>

              {/* QuickBooks */}
              <div className="flex items-start justify-between gap-4 py-1">
                <div>
                  <p className="text-sm font-sans" style={{ color: "#1a2e4a" }}>QuickBooks Online</p>
                  {qbConnected && qbRealmId && (
                    <p className="text-xs font-sans mt-0.5" style={{ color: "#8e9ab0" }}>
                      Company ID: {qbRealmId}
                    </p>
                  )}
                  {qbError && (
                    <p className="text-xs font-sans mt-0.5" style={{ color: "#c0392b" }}>
                      Error: {qbError}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                    style={qbConnected
                      ? { color: "#2d8a5e", backgroundColor: "#f0faf5" }
                      : { color: "#c8991a", backgroundColor: "#fdf8ec" }}
                  >
                    {qbConnected ? "Connected" : "Not Connected"}
                  </span>
                  <Link
                    href="/api/quickbooks/connect"
                    className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg border transition-all"
                    style={{ color: "#1a2e4a", borderColor: "#dce2ec", backgroundColor: "#f7f9fc" }}
                  >
                    {qbConnected ? "Reconnect" : "Connect QuickBooks"}
                  </Link>
                </div>
              </div>

              {/* Resend Email */}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>Resend (Email)</span>
                <span
                  className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                  style={resendActive
                    ? { color: "#2d8a5e", backgroundColor: "#f0faf5" }
                    : resendActive === null
                      ? { color: "#8e9ab0", backgroundColor: "#f7f9fc" }
                      : { color: "#c8991a", backgroundColor: "#fdf8ec" }}
                >
                  {resendActive === null ? "Checking…" : resendActive ? "Connected" : "Not Configured"}
                </span>
              </div>

              {/* EVV */}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>EVV State Submission (Maryland)</span>
                <span
                  className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                  style={{ color: "#2d8a5e", backgroundColor: "#f0faf5" }}
                >
                  Active
                </span>
              </div>

              {/* Supabase */}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>Supabase Database</span>
                <span className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                  style={{ color: "#2d8a5e", backgroundColor: "#f0faf5" }}>
                  Connected
                </span>
              </div>

            </div>
          </Section>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving}
              className="px-8 py-2.5 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-60"
              style={{ backgroundColor: "#1a2e4a" }}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
            {saved && (
              <span className="text-sm font-sans font-semibold" style={{ color: "#2d8a5e" }}>
                ✓ Settings saved
              </span>
            )}
            {error && (
              <span className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</span>
            )}
          </div>

        </div>
      </form>
    </div>
  );
}
