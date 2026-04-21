import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// ─── Colours ───────────────────────────────────────────────────────────────
const TEAL  = "#2AADAD";
const NAVY  = "#1a2e4a";
const GOLD  = "#c8991a";
const GRAY  = "#6b7280";
const LIGHT = "#f7f9fc";
const BORDER = "#dce2ec";

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: NAVY,
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
    backgroundColor: "#fff",
  },

  // Brand header
  headerWrap: { backgroundColor: NAVY, padding: 14, marginBottom: 0 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerBrand: { color: "#fff", fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 7, marginTop: 1, letterSpacing: 0.5 },
  headerTitle: { color: TEAL, fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textAlign: "right" },
  headerFormNo: { color: "rgba(255,255,255,0.4)", fontSize: 7, textAlign: "right", marginTop: 1 },
  goldLine: { height: 2, backgroundColor: GOLD, marginTop: 10 },
  tealLine: { height: 1, backgroundColor: TEAL, marginTop: 1, marginBottom: 0 },

  // Meta bar
  metaBar: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#eef6f6", paddingHorizontal: 14, paddingVertical: 6 },
  metaText: { fontSize: 8, color: NAVY },
  metaBold: { fontFamily: "Helvetica-Bold" },

  // Section header
  sectionHeader: { backgroundColor: TEAL, paddingVertical: 5, paddingHorizontal: 10, marginTop: 12, marginBottom: 0 },
  sectionHeaderText: { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6 },

  // Field rows
  fieldRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  fieldCell: { paddingVertical: 4, paddingHorizontal: 8 },
  fieldLabel: { fontSize: 7, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.3 },
  fieldValue: { fontSize: 8.5, color: NAVY, marginTop: 1 },
  shade: { backgroundColor: LIGHT },

  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "#e6f7f7", borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowShade: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: LIGHT },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: NAVY, paddingVertical: 5, paddingHorizontal: 6, textAlign: "center" },
  thLeft: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: NAVY, paddingVertical: 5, paddingHorizontal: 6 },
  td: { fontSize: 8, color: NAVY, paddingVertical: 4, paddingHorizontal: 6, textAlign: "center" },
  tdLeft: { fontSize: 8, color: NAVY, paddingVertical: 4, paddingHorizontal: 6 },

  // Checkbox
  checkFilled: { width: 9, height: 9, backgroundColor: TEAL, borderRadius: 1 },
  checkEmpty:  { width: 9, height: 9, borderWidth: 1, borderColor: GRAY, borderRadius: 1 },

  // Safety grid
  safetyGrid: { flexDirection: "row", flexWrap: "wrap" },
  safetyItem: { width: "25%", flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 6 },
  safetyLabel: { fontSize: 7.5, color: NAVY },

  // Signature lines
  sigRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  sigField: { flex: 1, borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 2, paddingTop: 10 },
  sigLabel: { fontSize: 7, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.3 },
  sigValue: { fontSize: 8.5, color: NAVY, marginTop: 1 },

  // Footer
  footer: { borderTopWidth: 2, borderTopColor: TEAL, paddingTop: 6, marginTop: 14, textAlign: "center", fontSize: 7, color: GRAY },
});

// ─── Static data ───────────────────────────────────────────────────────────
const ADL_TASKS = [
  { key: "bathing",     label: "Bathing" },
  { key: "dressing",    label: "Dressing" },
  { key: "grooming",    label: "Grooming / Hygiene" },
  { key: "toileting",   label: "Toileting" },
  { key: "transfers",   label: "Transfers / Mobility" },
  { key: "ambulation",  label: "Ambulation / Walking" },
  { key: "meal_prep",   label: "Meal Preparation" },
  { key: "feeding",     label: "Feeding" },
  { key: "medication",  label: "Medication Reminders" },
  { key: "housekeeping",label: "Housekeeping" },
  { key: "laundry",     label: "Laundry" },
  { key: "shopping",    label: "Shopping / Errands" },
];

const ADL_LEVELS = ["Independent", "Supervision", "Minimal Assist", "Moderate Assist", "Total Assist"];

const SERVICE_TASKS = [
  { key: "personal_care",       label: "Personal Care / Hygiene" },
  { key: "companionship",       label: "Companionship" },
  { key: "medication_reminders",label: "Medication Reminders" },
  { key: "meal_preparation",    label: "Meal Preparation" },
  { key: "light_housekeeping",  label: "Light Housekeeping" },
  { key: "transportation",      label: "Transportation / Errands" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SAFETY_FLAGS = [
  "Fall Risk", "Wandering Risk", "Skin Breakdown / Pressure Ulcers", "Swallowing / Choking Risk",
  "Cognitive Impairment", "Vision Impairment", "Hearing Impairment", "Behavioral Concerns",
  "Oxygen / Medical Equipment", "Isolation / Loneliness", "DNR Order on File", "Other",
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function v(data: Record<string, unknown>, key: string): string {
  const val = data[key];
  if (val === undefined || val === null || val === "") return "—";
  return String(val);
}

function arr(data: Record<string, unknown>, key: string): string[] {
  return (data[key] as string[] | undefined) ?? [];
}

// ─── Components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function FieldRow({ label, value, shade }: { label: string; value: string; shade?: boolean }) {
  return (
    <View style={[s.fieldRow, shade ? s.shade : {}]}>
      <View style={[s.fieldCell, { flex: 1 }]}>
        <Text style={s.fieldLabel}>{label}</Text>
        <Text style={s.fieldValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

function FieldRowDouble({
  label1, value1, label2, value2, shade,
}: { label1: string; value1: string; label2: string; value2: string; shade?: boolean }) {
  return (
    <View style={[s.fieldRow, shade ? s.shade : {}]}>
      <View style={[s.fieldCell, { flex: 1 }]}>
        <Text style={s.fieldLabel}>{label1}</Text>
        <Text style={s.fieldValue}>{value1 || "—"}</Text>
      </View>
      <View style={[s.fieldCell, { flex: 1, borderLeftWidth: 1, borderLeftColor: BORDER }]}>
        <Text style={s.fieldLabel}>{label2}</Text>
        <Text style={s.fieldValue}>{value2 || "—"}</Text>
      </View>
    </View>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return <View style={checked ? s.checkFilled : s.checkEmpty} />;
}

// ─── Main PDF Document ─────────────────────────────────────────────────────

interface Props {
  data: Record<string, unknown>;
  submittedBy: string;
  submittedAt: string;
}

function CarePlanDocument({ data, submittedBy, submittedAt }: Props) {
  const safetyFlags = arr(data, "safety_flags");

  return (
    <Document title={`Care Plan — ${v(data, "client_full_name")}`}>
      <Page size="LETTER" style={s.page}>

        {/* ── Brand header ── */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerBrand}>BETHEL-DIVINE</Text>
              <Text style={s.headerSub}>Health Care Services, LLC</Text>
            </View>
            <View>
              <Text style={s.headerTitle}>CLIENT CARE PLAN</Text>
              <Text style={s.headerFormNo}>Form: CP-001</Text>
            </View>
          </View>
          <View style={s.goldLine} />
        </View>

        {/* ── Meta bar ── */}
        <View style={s.metaBar}>
          <Text style={s.metaText}><Text style={s.metaBold}>Submitted by: </Text>{submittedBy}</Text>
          <Text style={s.metaText}><Text style={s.metaBold}>Date: </Text>{submittedAt}</Text>
        </View>

        {/* ── Section 1: Client Information ── */}
        <SectionHeader title="1. Client Information" />
        <FieldRowDouble label1="Client Full Name" value1={v(data, "client_full_name")} label2="Date of Birth" value2={v(data, "date_of_birth")} />
        <FieldRowDouble label1="Gender" value1={v(data, "gender")} label2="Medicaid / Medicare #" value2={v(data, "medicaid_number")} shade />
        <FieldRow label="Address" value={`${v(data, "address")}, ${v(data, "city")}, ${v(data, "state")} ${v(data, "zip_code")}`} />
        <FieldRowDouble label1="Primary Phone" value1={v(data, "primary_phone")} label2="Emergency Contact" value2={`${v(data, "emergency_contact_name")} (${v(data, "emergency_relationship")}) — ${v(data, "emergency_phone")}`} shade />
        <FieldRowDouble label1="Primary Physician" value1={v(data, "physician_name")} label2="Physician Phone" value2={v(data, "physician_phone")} />
        <FieldRowDouble label1="Date of Assessment" value1={v(data, "assessment_date")} label2="Care Plan Start Date" value2={v(data, "care_plan_start_date")} shade />

        {/* ── Section 2: Diagnoses ── */}
        <SectionHeader title="2. Primary Diagnoses & Medical History" />
        <FieldRowDouble label1="Primary Diagnosis" value1={v(data, "primary_diagnosis")} label2="ICD-10 Code" value2={v(data, "icd10_code")} />
        <FieldRow label="Secondary Diagnosis" value={v(data, "secondary_diagnosis")} shade />
        <FieldRow label="Known Allergies" value={v(data, "known_allergies")} />
        <FieldRow label="Relevant Medical / Surgical History" value={v(data, "medical_history")} shade />

        {/* ── Section 3: ADLs ── */}
        <SectionHeader title="3. Activities of Daily Living (ADLs)" />
        <View style={s.tableHeader}>
          <View style={{ width: 130 }}><Text style={s.thLeft}>ADL Task</Text></View>
          {ADL_LEVELS.map((l) => (
            <View key={l} style={{ flex: 1 }}><Text style={s.th}>{l}</Text></View>
          ))}
        </View>
        {ADL_TASKS.map((task, i) => {
          const selected = v(data, `adl_${task.key}`);
          return (
            <View key={task.key} style={i % 2 === 0 ? s.tableRow : s.tableRowShade}>
              <View style={{ width: 130 }}><Text style={s.tdLeft}>{task.label}</Text></View>
              {ADL_LEVELS.map((l) => (
                <View key={l} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 }}>
                  <Checkbox checked={selected === l} />
                </View>
              ))}
            </View>
          );
        })}

        {/* ── Section 4: Goals ── */}
        <SectionHeader title="4. Client Care Goals" />
        {[1, 2, 3].map((n, i) => (
          <View key={n} style={[s.fieldRow, i % 2 !== 0 ? s.shade : {}]}>
            <View style={[s.fieldCell, { flex: 3 }]}>
              <Text style={s.fieldLabel}>Goal {n}</Text>
              <Text style={s.fieldValue}>{v(data, `goal_${n}`)}</Text>
            </View>
            <View style={[s.fieldCell, { flex: 1, borderLeftWidth: 1, borderLeftColor: BORDER }]}>
              <Text style={s.fieldLabel}>Target Date</Text>
              <Text style={s.fieldValue}>{v(data, `goal_${n}_target_date`)}</Text>
            </View>
            <View style={[s.fieldCell, { flex: 1, borderLeftWidth: 1, borderLeftColor: BORDER }]}>
              <Text style={s.fieldLabel}>Status</Text>
              <Text style={s.fieldValue}>{v(data, `goal_${n}_status`)}</Text>
            </View>
          </View>
        ))}

        {/* ── Section 5: Services ── */}
        <SectionHeader title="5. Scheduled Services & Frequency" />
        <View style={s.tableHeader}>
          <View style={{ width: 140 }}><Text style={s.thLeft}>Service / Task</Text></View>
          <View style={{ width: 50 }}><Text style={s.th}>Hrs/Visit</Text></View>
          {DAYS.map((d) => (
            <View key={d} style={{ flex: 1 }}><Text style={s.th}>{d}</Text></View>
          ))}
        </View>
        {SERVICE_TASKS.map((svc, i) => {
          const days = arr(data, `service_${svc.key}_days`);
          return (
            <View key={svc.key} style={i % 2 === 0 ? s.tableRow : s.tableRowShade}>
              <View style={{ width: 140 }}><Text style={s.tdLeft}>{svc.label}</Text></View>
              <View style={{ width: 50, alignItems: "center", justifyContent: "center" }}>
                <Text style={s.td}>{v(data, `service_${svc.key}_hours`)}</Text>
              </View>
              {DAYS.map((d) => (
                <View key={d} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 }}>
                  <Checkbox checked={days.includes(d)} />
                </View>
              ))}
            </View>
          );
        })}

        {/* ── Section 6: Safety ── */}
        <SectionHeader title="6. Safety & Special Considerations" />
        <View style={[s.safetyGrid, { paddingHorizontal: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER }]}>
          {SAFETY_FLAGS.map((flag) => (
            <View key={flag} style={s.safetyItem}>
              <Checkbox checked={safetyFlags.includes(flag)} />
              <Text style={s.safetyLabel}>{flag}</Text>
            </View>
          ))}
        </View>
        <FieldRow label="Additional Safety Notes" value={v(data, "safety_notes")} shade />

        {/* ── Section 7: Preferences ── */}
        <SectionHeader title="7. Client Communication & Preferences" />
        <FieldRowDouble label1="Preferred Language" value1={v(data, "preferred_language")} label2="Preferred Name / Nickname" value2={v(data, "preferred_name")} />
        <FieldRow label="Religious / Cultural Preferences" value={v(data, "cultural_preferences")} shade />
        <FieldRow label="Likes / Preferences" value={v(data, "likes_preferences")} />
        <FieldRow label="Dislikes / Triggers to Avoid" value={v(data, "dislikes_triggers")} shade />

        {/* ── Section 8: Caregiver Notes ── */}
        <SectionHeader title="8. Caregiver Notes & Observations" />
        <FieldRow label="Notes" value={v(data, "caregiver_notes")} />

        {/* ── Section 9: Signatures ── */}
        <SectionHeader title="9. Signatures & Authorization" />
        <View style={{ paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2 }}>
          <Text style={{ fontSize: 7.5, color: GRAY, fontStyle: "italic", marginBottom: 8 }}>
            Names typed below serve as acknowledgment of this care plan.
          </Text>
          <View style={s.sigRow}>
            <View style={[s.sigField, { flex: 2 }]}>
              <Text style={s.sigLabel}>Client / Legal Guardian Signature</Text>
              <Text style={s.sigValue}>{v(data, "client_signature")}</Text>
            </View>
            <View style={s.sigField}>
              <Text style={s.sigLabel}>Date</Text>
              <Text style={s.sigValue}>{v(data, "client_signature_date")}</Text>
            </View>
            <View style={[s.sigField, { flex: 1.5 }]}>
              <Text style={s.sigLabel}>Relationship (if guardian)</Text>
              <Text style={s.sigValue}>{v(data, "guardian_relationship")}</Text>
            </View>
          </View>
          <View style={s.sigRow}>
            <View style={[s.sigField, { flex: 2 }]}>
              <Text style={s.sigLabel}>Care Coordinator / Supervisor</Text>
              <Text style={s.sigValue}>{v(data, "coordinator_signature")}</Text>
            </View>
            <View style={[s.sigField, { flex: 1.5 }]}>
              <Text style={s.sigLabel}>Printed Name</Text>
              <Text style={s.sigValue}>{v(data, "coordinator_printed_name")}</Text>
            </View>
            <View style={s.sigField}>
              <Text style={s.sigLabel}>Date</Text>
              <Text style={s.sigValue}>{v(data, "coordinator_signature_date")}</Text>
            </View>
          </View>
          <View style={s.sigRow}>
            <View style={[s.sigField, { flex: 2 }]}>
              <Text style={s.sigLabel}>Caregiver / Aide Signature</Text>
              <Text style={s.sigValue}>{v(data, "caregiver_signature")}</Text>
            </View>
            <View style={[s.sigField, { flex: 1.5 }]}>
              <Text style={s.sigLabel}>Printed Name</Text>
              <Text style={s.sigValue}>{v(data, "caregiver_printed_name")}</Text>
            </View>
            <View style={s.sigField}>
              <Text style={s.sigLabel}>Date</Text>
              <Text style={s.sigValue}>{v(data, "caregiver_signature_date")}</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={s.footer}>
          Bethel Divine Health Care Services, LLC · Confidential Client Record · Form CP-001
        </Text>

      </Page>
    </Document>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────

export async function generateCarePlanPdf(
  data: Record<string, unknown>,
  submittedBy: string,
  submittedAt: string
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <CarePlanDocument data={data} submittedBy={submittedBy} submittedAt={submittedAt} />
  );
  return Buffer.from(buffer);
}
