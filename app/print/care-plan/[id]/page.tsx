"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

const ClientCarePlanForm = dynamic(
  () => import("@/components/forms/ClientCarePlanForm"),
  { ssr: false }
);

const TEAL = "#2AADAD";
const NAVY = "#1a2e4a";
const GOLD = "#c8991a";
const BORDER = "#b0b8c8";
const TEAL_LIGHT = "#e6f7f7";

const ADL_TASKS = [
  { key: "bathing", label: "Bathing" },
  { key: "dressing", label: "Dressing" },
  { key: "grooming", label: "Grooming / Hygiene" },
  { key: "toileting", label: "Toileting" },
  { key: "transfers", label: "Transfers / Mobility" },
  { key: "ambulation", label: "Ambulation / Walking" },
  { key: "meal_prep", label: "Meal Preparation" },
  { key: "feeding", label: "Feeding" },
  { key: "medication", label: "Medication Reminders" },
  { key: "housekeeping", label: "Housekeeping" },
  { key: "laundry", label: "Laundry" },
  { key: "shopping", label: "Shopping / Errands" },
];

// Labels must match exactly what the form radio buttons save
const ADL_LEVELS = [
  { label: "Independent" },
  { label: "Supervision" },
  { label: "Minimal Assist" },
  { label: "Moderate Assist" },
  { label: "Total Assist" },
];

// Keys must match exactly what ClientCarePlanForm saves (service_${key}_hours / _days)
const SERVICES = [
  { key: "personal_care", label: "Personal Care / Hygiene" },
  { key: "companionship", label: "Companionship" },
  { key: "medication_reminders", label: "Medication Reminders" },
  { key: "meal_preparation", label: "Meal Preparation" },
  { key: "light_housekeeping", label: "Light Housekeeping" },
  { key: "transportation", label: "Transportation / Errands" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SAFETY_FLAGS = [
  "Fall Risk", "Wandering Risk", "Skin Breakdown / Pressure Ulcers", "Swallowing / Choking Risk",
  "Cognitive Impairment", "Vision Impairment", "Hearing Impairment", "Behavioral Concerns",
  "Oxygen / Medical Equipment", "Isolation / Loneliness", "DNR Order on File", "Other",
];

function val(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  if (v === undefined || v === null || v === "") return "";
  return String(v);
}

function days(data: Record<string, unknown>, key: string): string[] {
  const v = data[`service_${key}_days`];
  if (!Array.isArray(v)) return [];
  return v as string[];
}

function Box({ filled }: { filled: boolean }) {
  return (
    <span style={{
      display: "inline-block", width: "13px", height: "13px", border: `1.5px solid ${filled ? TEAL : "#666"}`,
      backgroundColor: filled ? TEAL : "transparent", borderRadius: "2px",
      verticalAlign: "middle", flexShrink: 0,
    }} />
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: TEAL, color: "#fff", fontWeight: 700, fontSize: "11px",
      letterSpacing: "0.8px", textTransform: "uppercase", padding: "6px 10px",
      marginTop: "18px", marginBottom: "10px",
    }}>
      {children}
    </div>
  );
}

function Field({ label, value, style }: { label: string; value: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px", ...style }}>
      <span style={{ fontSize: "8px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
      <span style={{ fontSize: "10px", color: NAVY, borderBottom: `1px solid ${BORDER}`, minHeight: "16px", paddingBottom: "2px" }}>
        {value || " "}
      </span>
    </div>
  );
}

export default function PrintCarePlanPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [submittedBy, setSubmittedBy] = useState<string>("");
  const [submittedAt, setSubmittedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/static-forms/${params.id}`)
      .then((r) => { if (!r.ok) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then((d) => {
        if (d) {
          setData(d.data as Record<string, unknown>);
          setSubmittedBy((d.profiles as { full_name?: string } | null)?.full_name ?? "");
          setSubmittedAt(new Date(d.created_at as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
        }
        setLoading(false);
      });
  }, [params.id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleEdit(updatedData: Record<string, unknown>) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/static-forms/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedData }),
      });
      if (!res.ok) {
        const body = await res.json();
        setSaveError(body.error ?? "Failed to save");
        setSaving(false);
        return;
      }
      // Refresh the page data and close the modal
      setShowEdit(false);
      loadData();
    } catch {
      setSaveError("Network error — please try again");
    }
    setSaving(false);
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
      <p style={{ color: "#8e9ab0" }}>Loading…</p>
    </div>
  );

  if (notFound || !data) return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", fontFamily: "system-ui", backgroundColor: "#f8f9fb", gap: "16px",
    }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fef2f2",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "#1a2e4a" }}>
          Form Not Found
        </h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", maxWidth: "320px", lineHeight: "1.5" }}>
          This care plan could not be loaded. It may have been deleted, or the link may be invalid.
        </p>
      </div>
      <button
        onClick={() => window.close()}
        style={{
          backgroundColor: "#2AADAD", color: "#fff", border: "none", borderRadius: "7px",
          padding: "9px 20px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
        }}
      >
        Close Tab
      </button>
    </div>
  );

  const safetyFlags = (data.safety_flags as string[] | undefined) ?? [];

  return (
    <>
      {/* ── Top action bar (hidden when printing) ── */}
      <div className="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: NAVY, padding: "10px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: "#fff", fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "14px" }}>
          BETHEL-DIVINE · Client Care Plan
        </span>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {submittedBy && (
            <span style={{ color: "#8e9ab0", fontSize: "12px", fontFamily: "system-ui" }}>
              Submitted by {submittedBy} · {submittedAt}
            </span>
          )}
          <button
            onClick={() => { setSaveError(null); setShowEdit(true); }}
            style={{
              backgroundColor: "transparent", color: "#fff",
              border: "1px solid rgba(255,255,255,0.35)", borderRadius: "8px",
              padding: "8px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              fontFamily: "system-ui",
            }}>
            ✏️ Edit
          </button>
          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: TEAL, color: "#fff", border: "none", borderRadius: "8px",
              padding: "8px 20px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
              fontFamily: "system-ui",
            }}>
            ⬇ Save as PDF / Print
          </button>
        </div>
      </div>

      {/* ── Edit modal ── */}
      {showEdit && (
        <div
          className="no-print"
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            backgroundColor: "rgba(0,0,0,0.55)",
            overflowY: "auto",
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "40px 16px 60px",
          }}
        >
          {/* Close strip */}
          <div style={{
            width: "100%", maxWidth: "940px", display: "flex",
            justifyContent: "space-between", alignItems: "center",
            marginBottom: "12px",
          }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "15px", fontFamily: "system-ui" }}>
              Edit Care Plan
            </span>
            <button
              onClick={() => setShowEdit(false)}
              style={{
                background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                borderRadius: "6px", padding: "6px 14px", fontSize: "13px",
                cursor: "pointer", fontFamily: "system-ui",
              }}
            >
              ✕ Cancel
            </button>
          </div>

          {saveError && (
            <div style={{
              width: "100%", maxWidth: "940px", marginBottom: "10px",
              backgroundColor: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: "6px", padding: "10px 14px",
              fontSize: "13px", color: "#dc2626", fontFamily: "system-ui",
            }}>
              {saveError}
            </div>
          )}

          <ClientCarePlanForm
            initialData={data}
            onSubmit={handleEdit}
            submitting={saving}
            submitLabel="Save Changes"
          />
        </div>
      )}

      {/* ── Main document ── */}
      <div style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: "10px",
        color: "#1a1a1a",
        maxWidth: "760px",
        margin: "0 auto",
        padding: "70px 24px 40px",
        backgroundColor: "#fff",
      }}>

        {/* Brand header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "4px" }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "20px", color: NAVY, letterSpacing: "1px" }}>
              BETHEL-DIVINE
            </div>
            <div style={{ fontSize: "8px", color: "#666", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Health Care Services, LLC
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: TEAL, letterSpacing: "1px", textTransform: "uppercase" }}>
              Client Care Plan
            </div>
            <div style={{ fontSize: "9px", color: "#666" }}>Bethel Divine Health Care Services, LLC</div>
          </div>
        </div>

        <div style={{ height: "2px", backgroundColor: GOLD, marginBottom: "2px" }} />
        <div style={{ height: "1px", backgroundColor: TEAL, marginBottom: "16px" }} />

        {/* ── Section 1: Client Information ── */}
        <SectionHeader>1. Client Information</SectionHeader>
        <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
          <Field label="Client Full Name" value={val(data, "client_full_name")} style={{ flex: 2 }} />
          <Field label="Date of Birth" value={val(data, "date_of_birth")} style={{ flex: 1 }} />
          <Field label="Gender" value={val(data, "gender")} style={{ flex: 1 }} />
          <Field label="Medicaid / Medicare #" value={val(data, "medicaid_number")} style={{ flex: 1.5 }} />
        </div>
        <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
          <Field label="Address" value={val(data, "address")} style={{ flex: 3 }} />
          <Field label="City" value={val(data, "city")} style={{ flex: 2 }} />
          <Field label="State" value={val(data, "state")} style={{ flex: 0.7 }} />
          <Field label="Zip Code" value={val(data, "zip_code")} style={{ flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
          <Field label="Primary Phone" value={val(data, "primary_phone")} style={{ flex: 1 }} />
          <Field label="Emergency Contact Name" value={val(data, "emergency_contact_name")} style={{ flex: 2 }} />
          <Field label="Relationship" value={val(data, "emergency_relationship")} style={{ flex: 1 }} />
          <Field label="Emergency Phone" value={val(data, "emergency_phone")} style={{ flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
          <Field label="Primary Physician / Doctor" value={val(data, "physician_name")} style={{ flex: 2 }} />
          <Field label="Physician Phone" value={val(data, "physician_phone")} style={{ flex: 1 }} />
          <Field label="Date of Assessment" value={val(data, "assessment_date")} style={{ flex: 1 }} />
          <Field label="Care Plan Start Date" value={val(data, "care_plan_start_date")} style={{ flex: 1 }} />
        </div>

        {/* ── Section 2: Diagnoses ── */}
        <SectionHeader>2. Primary Diagnoses &amp; Medical History</SectionHeader>
        <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
          <Field label="Primary Diagnosis" value={val(data, "primary_diagnosis")} style={{ flex: 2 }} />
          <Field label="ICD-10 Code" value={val(data, "icd10_code")} style={{ flex: 1 }} />
          <Field label="Secondary Diagnosis" value={val(data, "secondary_diagnosis")} style={{ flex: 2 }} />
        </div>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "3px" }}>
            Known Allergies (medications, food, environmental)
          </div>
          <div style={{ border: `1px solid ${BORDER}`, minHeight: "32px", padding: "4px 6px", fontSize: "10px", color: NAVY }}>
            {val(data, "known_allergies") || " "}
          </div>
        </div>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "3px" }}>
            Relevant Medical / Surgical History
          </div>
          <div style={{ border: `1px solid ${BORDER}`, minHeight: "32px", padding: "4px 6px", fontSize: "10px", color: NAVY }}>
            {val(data, "medical_history") || " "}
          </div>
        </div>

        {/* ── Section 3: ADLs ── */}
        <SectionHeader>3. Activities of Daily Living (ADLs) — Level of Assistance Needed</SectionHeader>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
          <thead>
            <tr style={{ backgroundColor: TEAL_LIGHT }}>
              <th style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", textAlign: "left", fontWeight: 700, color: NAVY }}>ADL Task</th>
              {ADL_LEVELS.map((l) => (
                <th key={l.label} style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", textAlign: "center", fontWeight: 700, color: NAVY, width: "90px" }}>
                  {l.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADL_TASKS.map((task, i) => {
              // The form saves the full label string e.g. "Independent", "Minimal Assist"
              const selected = val(data, `adl_${task.key}`);
              return (
                <tr key={task.key} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", color: NAVY }}>{task.label}</td>
                  {ADL_LEVELS.map((l) => (
                    <td key={l.label} style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", textAlign: "center" }}>
                      <Box filled={selected === l.label} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Section 4: Goals ── */}
        <SectionHeader>4. Client Care Goals</SectionHeader>
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
            <Field label={`Goal ${n}`} value={val(data, `goal_${n}`)} style={{ flex: 3 }} />
            <Field label="Target Date" value={val(data, `goal_${n}_target_date`)} style={{ flex: 1 }} />
            <Field label="Status" value={val(data, `goal_${n}_status`)} style={{ flex: 1 }} />
          </div>
        ))}

        {/* ── Section 5: Scheduled Services ── */}
        <SectionHeader>5. Scheduled Services &amp; Frequency</SectionHeader>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
          <thead>
            <tr style={{ backgroundColor: TEAL_LIGHT }}>
              <th style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", textAlign: "left", fontWeight: 700, color: NAVY }}>Service / Task</th>
              <th style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", textAlign: "center", fontWeight: 700, color: NAVY, width: "60px" }}>Hrs / Visit</th>
              {DAYS.map((d) => (
                <th key={d} style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", textAlign: "center", fontWeight: 700, color: NAVY, width: "36px" }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SERVICES.map((svc, i) => {
              const serviceDays = days(data, svc.key);
              return (
                <tr key={svc.key} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", color: NAVY }}>{svc.label}</td>
                  <td style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", textAlign: "center", color: NAVY }}>
                    {val(data, `service_${svc.key}_hours`)}
                  </td>
                  {DAYS.map((d) => (
                    <td key={d} style={{ border: `1px solid ${BORDER}`, padding: "5px 8px", textAlign: "center" }}>
                      <Box filled={serviceDays.includes(d)} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Section 6: Safety ── */}
        <SectionHeader>6. Safety &amp; Special Considerations</SectionHeader>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 12px", marginBottom: "8px" }}>
          {SAFETY_FLAGS.map((flag) => (
            <div key={flag} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "9px", color: NAVY }}>
              <Box filled={safetyFlags.includes(flag)} />
              <span>{flag}</span>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "3px" }}>
            Additional Safety Notes
          </div>
          <div style={{ border: `1px solid ${BORDER}`, minHeight: "32px", padding: "4px 6px", fontSize: "10px", color: NAVY }}>
            {val(data, "safety_notes") || " "}
          </div>
        </div>

        {/* ── Section 7: Communication & Preferences ── */}
        <SectionHeader>7. Client Communication &amp; Preferences</SectionHeader>
        <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
          <Field label="Preferred Language" value={val(data, "preferred_language")} style={{ flex: 1 }} />
          <Field label="Preferred Name / Nickname" value={val(data, "preferred_name")} style={{ flex: 1 }} />
          <Field label="Religious / Cultural Preferences" value={val(data, "cultural_preferences")} style={{ flex: 1.5 }} />
        </div>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "3px" }}>
            Likes / Preferences (hobbies, food, routine)
          </div>
          <div style={{ border: `1px solid ${BORDER}`, minHeight: "32px", padding: "4px 6px", fontSize: "10px", color: NAVY }}>
            {val(data, "likes_preferences") || " "}
          </div>
        </div>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "3px" }}>
            Dislikes / Triggers to Avoid
          </div>
          <div style={{ border: `1px solid ${BORDER}`, minHeight: "32px", padding: "4px 6px", fontSize: "10px", color: NAVY }}>
            {val(data, "dislikes_triggers") || " "}
          </div>
        </div>

        {/* ── Section 8: Caregiver Notes ── */}
        <SectionHeader>8. Caregiver Notes &amp; Observations</SectionHeader>
        <div style={{ border: `1px solid ${BORDER}`, minHeight: "56px", padding: "4px 6px", fontSize: "10px", color: NAVY, marginBottom: "6px" }}>
          {val(data, "caregiver_notes") || " "}
        </div>

        {/* ── Section 9: Signatures ── */}
        <SectionHeader>9. Signatures &amp; Authorization</SectionHeader>
        <div style={{ fontSize: "8px", color: "#666", marginBottom: "10px", fontStyle: "italic" }}>
          Names typed below serve as acknowledgment of this care plan.
        </div>
        <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
          <Field label="Client / Legal Guardian Signature" value={val(data, "client_signature")} style={{ flex: 2 }} />
          <Field label="Date" value={val(data, "client_signature_date")} style={{ flex: 1 }} />
          <Field label="Relationship (if guardian)" value={val(data, "guardian_relationship")} style={{ flex: 1.5 }} />
        </div>
        <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
          <Field label="Care Coordinator / Supervisor Signature" value={val(data, "coordinator_signature")} style={{ flex: 2 }} />
          <Field label="Printed Name" value={val(data, "coordinator_printed_name")} style={{ flex: 2 }} />
          <Field label="Date" value={val(data, "coordinator_signature_date")} style={{ flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <Field label="Caregiver / Aide Signature" value={val(data, "caregiver_signature")} style={{ flex: 2 }} />
          <Field label="Printed Name" value={val(data, "caregiver_printed_name")} style={{ flex: 2 }} />
          <Field label="Date" value={val(data, "caregiver_signature_date")} style={{ flex: 1 }} />
        </div>

        {/* Footer */}
        <div style={{ borderTop: `2px solid ${TEAL}`, paddingTop: "6px", textAlign: "center", fontSize: "8px", color: "#888" }}>
          Bethel Divine Health Care Services, LLC · Confidential Client Record · Form: CP-001
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          div[style*="padding: 70px"] { padding-top: 24px !important; }
        }
        @page {
          size: letter;
          margin: 0.6in 0.65in;
        }
      `}</style>
    </>
  );
}
