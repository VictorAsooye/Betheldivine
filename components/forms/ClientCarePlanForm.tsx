"use client";

import { useState } from "react";

interface Props {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}

const NAVY = "#1a2e4a";
const TEAL = "#2AADAD";
const GOLD = "#c8991a";
const GRAY = "#8e9ab0";
const BORDER = "#dce2ec";
const TEAL_LIGHT = "#e8f8f8";

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: GRAY,
  display: "block",
  marginBottom: "3px",
  fontFamily: "var(--font-source-sans), system-ui, sans-serif",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${BORDER}`,
  outline: "none",
  fontSize: "13px",
  color: NAVY,
  padding: "4px 0 6px",
  fontFamily: "var(--font-source-sans), system-ui, sans-serif",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: `1px solid ${BORDER}`,
  borderRadius: "4px",
  outline: "none",
  fontSize: "13px",
  color: NAVY,
  padding: "8px",
  fontFamily: "var(--font-source-sans), system-ui, sans-serif",
  resize: "vertical",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${BORDER}`,
  outline: "none",
  fontSize: "13px",
  color: NAVY,
  padding: "4px 0 6px",
  fontFamily: "var(--font-source-sans), system-ui, sans-serif",
};

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div
      style={{
        backgroundColor: TEAL,
        padding: "8px 16px",
        marginBottom: "16px",
        borderRadius: "3px",
      }}
    >
      <span
        style={{
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.8px",
          fontFamily: "var(--font-source-sans), system-ui, sans-serif",
        }}
      >
        {number}. {title}
      </span>
    </div>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

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

const ADL_LEVELS = ["Independent", "Supervision", "Minimal Assist", "Moderate Assist", "Total Assist"];

const SERVICE_TASKS = [
  { key: "personal_care", label: "Personal Care / Hygiene" },
  { key: "companionship", label: "Companionship" },
  { key: "medication_reminders", label: "Medication Reminders" },
  { key: "meal_preparation", label: "Meal Preparation" },
  { key: "light_housekeeping", label: "Light Housekeeping" },
  { key: "transportation", label: "Transportation / Errands" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SAFETY_FLAGS = [
  "Fall Risk",
  "Wandering Risk",
  "Skin Breakdown / Pressure Ulcers",
  "Swallowing / Choking Risk",
  "Cognitive Impairment",
  "Vision Impairment",
  "Hearing Impairment",
  "Behavioral Concerns",
  "Oxygen / Medical Equipment",
  "Isolation / Loneliness",
  "DNR Order on File",
  "Other",
];

type FormData = Record<string, unknown>;

export default function ClientCarePlanForm({ onSubmit, submitting }: Props) {
  const [formData, setFormData] = useState<FormData>({});

  function set(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function get(key: string): string {
    return (formData[key] as string) ?? "";
  }

  function getArr(key: string): string[] {
    return (formData[key] as string[]) ?? [];
  }

  function toggleFlag(flag: string) {
    const current = getArr("safety_flags");
    const next = current.includes(flag)
      ? current.filter((f) => f !== flag)
      : [...current, flag];
    set("safety_flags", next);
  }

  function toggleServiceDay(serviceKey: string, day: string) {
    const current = getArr(`service_${serviceKey}_days`);
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    set(`service_${serviceKey}_days`, next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(formData);
  }

  const sectionPad: React.CSSProperties = { padding: "20px 24px 8px" };
  const rowGap: React.CSSProperties = { display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" };

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "#fff",
        fontFamily: "var(--font-source-sans), system-ui, sans-serif",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      {/* Brand Header */}
      <div style={{ backgroundColor: NAVY, padding: "20px 28px 16px" }}>
        <div
          style={{
            fontFamily: "var(--font-lora), Georgia, serif",
            fontSize: "18px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.5px",
          }}
        >
          BETHEL-DIVINE
        </div>
        <div style={{ height: "2px", background: GOLD, borderRadius: "1px", marginTop: "12px" }} />
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: TEAL,
              fontFamily: "var(--font-lora), Georgia, serif",
            }}
          >
            CLIENT CARE PLAN
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginTop: "4px" }}>
            Bethel Divine Health Care Services, LLC · Form: CP-001
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1 — Client Information */}
        <div style={sectionPad}>
          <SectionHeader number={1} title="Client Information" />

          <div style={rowGap}>
            <Field label="Client Full Name" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyle} value={get("client_full_name")} onChange={(e) => set("client_full_name", e.target.value)} />
            </Field>
            <Field label="Date of Birth" style={{ width: "128px" }}>
              <input type="date" style={inputStyle} value={get("date_of_birth")} onChange={(e) => set("date_of_birth", e.target.value)} />
            </Field>
            <Field label="Gender" style={{ width: "112px" }}>
              <select style={selectStyle} value={get("gender")} onChange={(e) => set("gender", e.target.value)}>
                <option value="">—</option>
                <option>Male</option>
                <option>Female</option>
                <option>Non-binary</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Medicaid/Medicare #" style={{ width: "192px" }}>
              <input style={inputStyle} value={get("medicaid_number")} onChange={(e) => set("medicaid_number", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Address" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyle} value={get("address")} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="City" style={{ width: "160px" }}>
              <input style={inputStyle} value={get("city")} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="State" style={{ width: "80px" }}>
              <input style={inputStyle} maxLength={2} value={get("state")} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="Zip Code" style={{ width: "112px" }}>
              <input style={inputStyle} value={get("zip_code")} onChange={(e) => set("zip_code", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Primary Phone" style={{ width: "160px" }}>
              <input style={inputStyle} type="tel" value={get("primary_phone")} onChange={(e) => set("primary_phone", e.target.value)} />
            </Field>
            <Field label="Emergency Contact Name" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyle} value={get("emergency_contact_name")} onChange={(e) => set("emergency_contact_name", e.target.value)} />
            </Field>
            <Field label="Relationship" style={{ width: "160px" }}>
              <input style={inputStyle} value={get("emergency_relationship")} onChange={(e) => set("emergency_relationship", e.target.value)} />
            </Field>
            <Field label="Emergency Phone" style={{ width: "160px" }}>
              <input style={inputStyle} type="tel" value={get("emergency_phone")} onChange={(e) => set("emergency_phone", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Primary Physician / Doctor" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyle} value={get("physician_name")} onChange={(e) => set("physician_name", e.target.value)} />
            </Field>
            <Field label="Physician Phone" style={{ width: "160px" }}>
              <input style={inputStyle} type="tel" value={get("physician_phone")} onChange={(e) => set("physician_phone", e.target.value)} />
            </Field>
            <Field label="Date of Assessment" style={{ width: "160px" }}>
              <input type="date" style={inputStyle} value={get("assessment_date")} onChange={(e) => set("assessment_date", e.target.value)} />
            </Field>
            <Field label="Care Plan Start Date" style={{ width: "160px" }}>
              <input type="date" style={inputStyle} value={get("care_plan_start_date")} onChange={(e) => set("care_plan_start_date", e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Section 2 — Primary Diagnoses & Medical History */}
        <div style={sectionPad}>
          <SectionHeader number={2} title="Primary Diagnoses & Medical History" />

          <div style={rowGap}>
            <Field label="Primary Diagnosis" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyle} value={get("primary_diagnosis")} onChange={(e) => set("primary_diagnosis", e.target.value)} />
            </Field>
            <Field label="ICD-10 Code" style={{ width: "144px" }}>
              <input style={inputStyle} value={get("icd10_code")} onChange={(e) => set("icd10_code", e.target.value)} />
            </Field>
            <Field label="Secondary Diagnosis" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyle} value={get("secondary_diagnosis")} onChange={(e) => set("secondary_diagnosis", e.target.value)} />
            </Field>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Field label="Known Allergies">
              <textarea
                style={textareaStyle}
                rows={3}
                value={get("known_allergies")}
                onChange={(e) => set("known_allergies", e.target.value)}
              />
            </Field>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Field label="Relevant Medical / Surgical History">
              <textarea
                style={textareaStyle}
                rows={3}
                value={get("medical_history")}
                onChange={(e) => set("medical_history", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 3 — ADLs */}
        <div style={sectionPad}>
          <SectionHeader number={3} title="Activities of Daily Living (ADLs)" />

          <div style={{ overflowX: "auto", marginBottom: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: TEAL_LIGHT }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: NAVY, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, minWidth: "160px" }}>
                    ADL Task
                  </th>
                  {ADL_LEVELS.map((level) => (
                    <th key={level} style={{ padding: "8px 8px", textAlign: "center", color: NAVY, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                      {level}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ADL_TASKS.map((task, idx) => (
                  <tr key={task.key} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#fafbfd" }}>
                    <td style={{ padding: "8px 12px", color: NAVY, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>
                      {task.label}
                    </td>
                    {ADL_LEVELS.map((level) => (
                      <td key={level} style={{ padding: "8px", textAlign: "center", borderBottom: `1px solid ${BORDER}` }}>
                        <input
                          type="radio"
                          name={`adl_${task.key}`}
                          value={level}
                          checked={get(`adl_${task.key}`) === level}
                          onChange={() => set(`adl_${task.key}`, level)}
                          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: TEAL }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4 — Client Care Goals */}
        <div style={sectionPad}>
          <SectionHeader number={4} title="Client Care Goals" />

          {[1, 2, 3].map((n) => (
            <div key={n} style={{ ...rowGap, alignItems: "flex-end" }}>
              <Field label={`Goal ${n}`} style={{ flex: 1, minWidth: "200px" }}>
                <input
                  style={inputStyle}
                  value={get(`goal_${n}`)}
                  onChange={(e) => set(`goal_${n}`, e.target.value)}
                />
              </Field>
              <Field label="Target Date" style={{ width: "160px" }}>
                <input
                  type="date"
                  style={inputStyle}
                  value={get(`goal_${n}_target_date`)}
                  onChange={(e) => set(`goal_${n}_target_date`, e.target.value)}
                />
              </Field>
              <Field label="Status" style={{ width: "176px" }}>
                <select
                  style={selectStyle}
                  value={get(`goal_${n}_status`)}
                  onChange={(e) => set(`goal_${n}_status`, e.target.value)}
                >
                  <option value="">—</option>
                  <option>In Progress</option>
                  <option>Achieved</option>
                  <option>Not Started</option>
                  <option>Discontinued</option>
                </select>
              </Field>
            </div>
          ))}
        </div>

        {/* Section 5 — Scheduled Services & Frequency */}
        <div style={sectionPad}>
          <SectionHeader number={5} title="Scheduled Services & Frequency" />

          <div style={{ overflowX: "auto", marginBottom: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: TEAL_LIGHT }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: NAVY, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, minWidth: "180px" }}>
                    Service / Task
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: NAVY, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, width: "80px" }}>
                    Hrs/Visit
                  </th>
                  {DAYS.map((day) => (
                    <th key={day} style={{ padding: "8px", textAlign: "center", color: NAVY, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, width: "44px" }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SERVICE_TASKS.map((task, idx) => (
                  <tr key={task.key} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#fafbfd" }}>
                    <td style={{ padding: "8px 12px", color: NAVY, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>
                      {task.label}
                    </td>
                    <td style={{ padding: "8px", textAlign: "center", borderBottom: `1px solid ${BORDER}` }}>
                      <input
                        type="text"
                        style={{
                          width: "64px",
                          border: `1px solid ${BORDER}`,
                          borderRadius: "3px",
                          padding: "3px 6px",
                          fontSize: "12px",
                          textAlign: "center",
                          color: NAVY,
                          background: "#fff",
                          outline: "none",
                        }}
                        value={get(`service_${task.key}_hours`)}
                        onChange={(e) => set(`service_${task.key}_hours`, e.target.value)}
                      />
                    </td>
                    {DAYS.map((day) => (
                      <td key={day} style={{ padding: "8px", textAlign: "center", borderBottom: `1px solid ${BORDER}` }}>
                        <input
                          type="checkbox"
                          checked={getArr(`service_${task.key}_days`).includes(day)}
                          onChange={() => toggleServiceDay(task.key, day)}
                          style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: TEAL }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 6 — Safety & Special Considerations */}
        <div style={sectionPad}>
          <SectionHeader number={6} title="Safety & Special Considerations" />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "10px 16px",
              marginBottom: "16px",
            }}
          >
            {SAFETY_FLAGS.map((flag) => (
              <label
                key={flag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: NAVY,
                  cursor: "pointer",
                  fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                }}
              >
                <input
                  type="checkbox"
                  checked={getArr("safety_flags").includes(flag)}
                  onChange={() => toggleFlag(flag)}
                  style={{ width: "15px", height: "15px", accentColor: TEAL, flexShrink: 0 }}
                />
                {flag}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Field label="Additional Safety Notes">
              <textarea
                style={textareaStyle}
                rows={3}
                value={get("safety_notes")}
                onChange={(e) => set("safety_notes", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 7 — Client Communication & Preferences */}
        <div style={sectionPad}>
          <SectionHeader number={7} title="Client Communication & Preferences" />

          <div style={rowGap}>
            <Field label="Preferred Language" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyle} value={get("preferred_language")} onChange={(e) => set("preferred_language", e.target.value)} />
            </Field>
            <Field label="Preferred Name / Nickname" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyle} value={get("preferred_name")} onChange={(e) => set("preferred_name", e.target.value)} />
            </Field>
            <Field label="Religious / Cultural Preferences" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyle} value={get("cultural_preferences")} onChange={(e) => set("cultural_preferences", e.target.value)} />
            </Field>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Field label="Likes / Preferences">
              <textarea
                style={textareaStyle}
                rows={3}
                value={get("likes_preferences")}
                onChange={(e) => set("likes_preferences", e.target.value)}
              />
            </Field>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Field label="Dislikes / Triggers to Avoid">
              <textarea
                style={textareaStyle}
                rows={3}
                value={get("dislikes_triggers")}
                onChange={(e) => set("dislikes_triggers", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 8 — Caregiver Notes & Observations */}
        <div style={sectionPad}>
          <SectionHeader number={8} title="Caregiver Notes & Observations" />

          <div style={{ marginBottom: "16px" }}>
            <Field label="Notes">
              <textarea
                style={textareaStyle}
                rows={5}
                value={get("caregiver_notes")}
                onChange={(e) => set("caregiver_notes", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 9 — Signatures & Authorization */}
        <div style={sectionPad}>
          <SectionHeader number={9} title="Signatures & Authorization" />

          <p style={{ fontSize: "11px", color: GRAY, marginBottom: "16px", fontStyle: "italic" }}>
            Type full name in each signature field as acknowledgment.
          </p>

          <div style={rowGap}>
            <Field label="Client / Legal Guardian Signature" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyle} value={get("client_signature")} onChange={(e) => set("client_signature", e.target.value)} />
            </Field>
            <Field label="Date" style={{ width: "160px" }}>
              <input type="date" style={inputStyle} value={get("client_signature_date")} onChange={(e) => set("client_signature_date", e.target.value)} />
            </Field>
            <Field label="Relationship if Guardian" style={{ width: "192px" }}>
              <input style={inputStyle} value={get("guardian_relationship")} onChange={(e) => set("guardian_relationship", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Care Coordinator / Supervisor Signature" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyle} value={get("coordinator_signature")} onChange={(e) => set("coordinator_signature", e.target.value)} />
            </Field>
            <Field label="Printed Name" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyle} value={get("coordinator_printed_name")} onChange={(e) => set("coordinator_printed_name", e.target.value)} />
            </Field>
            <Field label="Date" style={{ width: "160px" }}>
              <input type="date" style={inputStyle} value={get("coordinator_signature_date")} onChange={(e) => set("coordinator_signature_date", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Caregiver / Aide Signature" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyle} value={get("caregiver_signature")} onChange={(e) => set("caregiver_signature", e.target.value)} />
            </Field>
            <Field label="Printed Name" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyle} value={get("caregiver_printed_name")} onChange={(e) => set("caregiver_printed_name", e.target.value)} />
            </Field>
            <Field label="Date" style={{ width: "160px" }}>
              <input type="date" style={inputStyle} value={get("caregiver_signature_date")} onChange={(e) => set("caregiver_signature_date", e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 24px",
            textAlign: "center",
            fontSize: "11px",
            color: GRAY,
            borderTop: `1px solid ${BORDER}`,
            backgroundColor: "#fafbfd",
          }}
        >
          Bethel Divine Health Care Services, LLC · Confidential Client Record · Form: CP-001
        </div>

        {/* Submit */}
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 24px" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              backgroundColor: submitting ? "#8e9ab0" : NAVY,
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "var(--font-source-sans), system-ui, sans-serif",
              letterSpacing: "0.3px",
              transition: "background-color 0.2s",
            }}
          >
            {submitting ? "Submitting…" : "Submit Care Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}
