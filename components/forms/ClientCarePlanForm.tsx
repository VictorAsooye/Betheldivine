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
const ERROR_RED = "#dc2626";
const ERROR_BG = "#fef2f2";

// Fields that MUST be filled before submission
const REQUIRED_FIELDS: Record<string, string> = {
  client_full_name: "Client Full Name",
  date_of_birth: "Date of Birth",
  primary_phone: "Primary Phone",
  address: "Address",
  assessment_date: "Date of Assessment",
  care_plan_start_date: "Care Plan Start Date",
  primary_diagnosis: "Primary Diagnosis",
  client_signature: "Client / Legal Guardian Signature",
  client_signature_date: "Signature Date",
  coordinator_signature: "Care Coordinator / Supervisor Signature",
};

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

function inputStyleFor(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    background: hasError ? ERROR_BG : "transparent",
    border: "none",
    borderBottom: `1.5px solid ${hasError ? ERROR_RED : BORDER}`,
    outline: "none",
    fontSize: "13px",
    color: NAVY,
    padding: "4px 0 6px",
    fontFamily: "var(--font-source-sans), system-ui, sans-serif",
  };
}

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
  fieldKey,
  children,
  style,
  error,
}: {
  label: string;
  fieldKey?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  error?: string;
}) {
  const isRequired = fieldKey ? fieldKey in REQUIRED_FIELDS : false;
  return (
    <div style={style}>
      <label style={labelStyle}>
        {label}
        {isRequired && (
          <span style={{ color: ERROR_RED, marginLeft: "3px" }}>*</span>
        )}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: "10px", color: ERROR_RED, marginTop: "3px", display: "block" }}>
          {error}
        </span>
      )}
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrorSummary, setShowErrorSummary] = useState(false);

  function set(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field as soon as user fills it
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
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

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    for (const [key, label] of Object.entries(REQUIRED_FIELDS)) {
      const val = formData[key];
      if (!val || (typeof val === "string" && val.trim() === "")) {
        newErrors[key] = `${label} is required`;
      }
    }
    setErrors(newErrors);
    setShowErrorSummary(Object.keys(newErrors).length > 0);

    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      setTimeout(() => {
        const el = document.querySelector("[data-error='true']");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
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

      {/* Required fields note */}
      <div style={{ padding: "10px 24px", backgroundColor: "#fafbfd", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: "11px", color: GRAY, fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
          Fields marked <span style={{ color: ERROR_RED, fontWeight: 700 }}>*</span> are required
        </span>
      </div>

      {/* Error summary banner */}
      {showErrorSummary && (
        <div
          data-error="true"
          style={{
            margin: "16px 24px 0",
            backgroundColor: ERROR_BG,
            border: `1px solid #fca5a5`,
            borderRadius: "6px",
            padding: "12px 16px",
          }}
        >
          <div style={{ fontWeight: 700, color: ERROR_RED, fontSize: "12px", marginBottom: "6px" }}>
            Please complete the following required fields:
          </div>
          <ul style={{ margin: 0, paddingLeft: "16px" }}>
            {Object.values(errors).map((msg, i) => (
              <li key={i} style={{ fontSize: "12px", color: ERROR_RED, marginBottom: "2px" }}>
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Section 1 — Client Information */}
        <div style={sectionPad}>
          <SectionHeader number={1} title="Client Information" />

          <div style={rowGap}>
            <Field label="Client Full Name" fieldKey="client_full_name" style={{ flex: 1, minWidth: "200px" }} error={errors.client_full_name}>
              <input
                style={inputStyleFor(!!errors.client_full_name)}
                value={get("client_full_name")}
                onChange={(e) => set("client_full_name", e.target.value)}
              />
            </Field>
            <Field label="Date of Birth" fieldKey="date_of_birth" style={{ width: "128px" }} error={errors.date_of_birth}>
              <input
                type="date"
                style={inputStyleFor(!!errors.date_of_birth)}
                value={get("date_of_birth")}
                onChange={(e) => set("date_of_birth", e.target.value)}
              />
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
              <input style={inputStyleFor(false)} value={get("medicaid_number")} onChange={(e) => set("medicaid_number", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Address" fieldKey="address" style={{ flex: 1, minWidth: "200px" }} error={errors.address}>
              <input
                style={inputStyleFor(!!errors.address)}
                value={get("address")}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
            <Field label="City" style={{ width: "160px" }}>
              <input style={inputStyleFor(false)} value={get("city")} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="State" style={{ width: "80px" }}>
              <input style={inputStyleFor(false)} maxLength={2} value={get("state")} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="Zip Code" style={{ width: "112px" }}>
              <input style={inputStyleFor(false)} value={get("zip_code")} onChange={(e) => set("zip_code", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Primary Phone" fieldKey="primary_phone" style={{ width: "160px" }} error={errors.primary_phone}>
              <input
                style={inputStyleFor(!!errors.primary_phone)}
                type="tel"
                value={get("primary_phone")}
                onChange={(e) => set("primary_phone", e.target.value)}
              />
            </Field>
            <Field label="Emergency Contact Name" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyleFor(false)} value={get("emergency_contact_name")} onChange={(e) => set("emergency_contact_name", e.target.value)} />
            </Field>
            <Field label="Relationship" style={{ width: "160px" }}>
              <input style={inputStyleFor(false)} value={get("emergency_relationship")} onChange={(e) => set("emergency_relationship", e.target.value)} />
            </Field>
            <Field label="Emergency Phone" style={{ width: "160px" }}>
              <input style={inputStyleFor(false)} type="tel" value={get("emergency_phone")} onChange={(e) => set("emergency_phone", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Primary Physician / Doctor" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyleFor(false)} value={get("physician_name")} onChange={(e) => set("physician_name", e.target.value)} />
            </Field>
            <Field label="Physician Phone" style={{ width: "160px" }}>
              <input style={inputStyleFor(false)} type="tel" value={get("physician_phone")} onChange={(e) => set("physician_phone", e.target.value)} />
            </Field>
            <Field label="Date of Assessment" fieldKey="assessment_date" style={{ width: "160px" }} error={errors.assessment_date}>
              <input
                type="date"
                style={inputStyleFor(!!errors.assessment_date)}
                value={get("assessment_date")}
                onChange={(e) => set("assessment_date", e.target.value)}
              />
            </Field>
            <Field label="Care Plan Start Date" fieldKey="care_plan_start_date" style={{ width: "160px" }} error={errors.care_plan_start_date}>
              <input
                type="date"
                style={inputStyleFor(!!errors.care_plan_start_date)}
                value={get("care_plan_start_date")}
                onChange={(e) => set("care_plan_start_date", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 2 — Primary Diagnoses & Medical History */}
        <div style={sectionPad}>
          <SectionHeader number={2} title="Primary Diagnoses & Medical History" />

          <div style={rowGap}>
            <Field label="Primary Diagnosis" fieldKey="primary_diagnosis" style={{ flex: 1, minWidth: "200px" }} error={errors.primary_diagnosis}>
              <input
                style={inputStyleFor(!!errors.primary_diagnosis)}
                value={get("primary_diagnosis")}
                onChange={(e) => set("primary_diagnosis", e.target.value)}
              />
            </Field>
            <Field label="ICD-10 Code" style={{ width: "144px" }}>
              <input style={inputStyleFor(false)} value={get("icd10_code")} onChange={(e) => set("icd10_code", e.target.value)} />
            </Field>
            <Field label="Secondary Diagnosis" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyleFor(false)} value={get("secondary_diagnosis")} onChange={(e) => set("secondary_diagnosis", e.target.value)} />
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
                  style={inputStyleFor(false)}
                  value={get(`goal_${n}`)}
                  onChange={(e) => set(`goal_${n}`, e.target.value)}
                />
              </Field>
              <Field label="Target Date" style={{ width: "160px" }}>
                <input
                  type="date"
                  style={inputStyleFor(false)}
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
              <input style={inputStyleFor(false)} value={get("preferred_language")} onChange={(e) => set("preferred_language", e.target.value)} />
            </Field>
            <Field label="Preferred Name / Nickname" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyleFor(false)} value={get("preferred_name")} onChange={(e) => set("preferred_name", e.target.value)} />
            </Field>
            <Field label="Religious / Cultural Preferences" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyleFor(false)} value={get("cultural_preferences")} onChange={(e) => set("cultural_preferences", e.target.value)} />
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
            <Field label="Client / Legal Guardian Signature" fieldKey="client_signature" style={{ flex: 1, minWidth: "200px" }} error={errors.client_signature}>
              <input
                style={inputStyleFor(!!errors.client_signature)}
                value={get("client_signature")}
                onChange={(e) => set("client_signature", e.target.value)}
              />
            </Field>
            <Field label="Date" fieldKey="client_signature_date" style={{ width: "160px" }} error={errors.client_signature_date}>
              <input
                type="date"
                style={inputStyleFor(!!errors.client_signature_date)}
                value={get("client_signature_date")}
                onChange={(e) => set("client_signature_date", e.target.value)}
              />
            </Field>
            <Field label="Relationship if Guardian" style={{ width: "192px" }}>
              <input style={inputStyleFor(false)} value={get("guardian_relationship")} onChange={(e) => set("guardian_relationship", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Care Coordinator / Supervisor Signature" fieldKey="coordinator_signature" style={{ flex: 1, minWidth: "200px" }} error={errors.coordinator_signature}>
              <input
                style={inputStyleFor(!!errors.coordinator_signature)}
                value={get("coordinator_signature")}
                onChange={(e) => set("coordinator_signature", e.target.value)}
              />
            </Field>
            <Field label="Printed Name" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyleFor(false)} value={get("coordinator_printed_name")} onChange={(e) => set("coordinator_printed_name", e.target.value)} />
            </Field>
            <Field label="Date" style={{ width: "160px" }}>
              <input type="date" style={inputStyleFor(false)} value={get("coordinator_signature_date")} onChange={(e) => set("coordinator_signature_date", e.target.value)} />
            </Field>
          </div>

          <div style={rowGap}>
            <Field label="Caregiver / Aide Signature" style={{ flex: 1, minWidth: "200px" }}>
              <input style={inputStyleFor(false)} value={get("caregiver_signature")} onChange={(e) => set("caregiver_signature", e.target.value)} />
            </Field>
            <Field label="Printed Name" style={{ flex: 1, minWidth: "160px" }}>
              <input style={inputStyleFor(false)} value={get("caregiver_printed_name")} onChange={(e) => set("caregiver_printed_name", e.target.value)} />
            </Field>
            <Field label="Date" style={{ width: "160px" }}>
              <input type="date" style={inputStyleFor(false)} value={get("caregiver_signature_date")} onChange={(e) => set("caregiver_signature_date", e.target.value)} />
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
