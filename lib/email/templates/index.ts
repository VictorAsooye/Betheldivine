// ── Shared brand wrapper ────────────────────────────────────────────────────

function branded(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Bethel Divine Healthcare</title>
</head>
<body style="margin:0;padding:0;background:#f7f9fc;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1a2e4a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#1a2e4a;border-radius:12px 12px 0 0;padding:24px 32px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">BETHEL-DIVINE</div>
      <div style="font-size:11px;color:#8e9ab0;letter-spacing:2px;margin-top:2px;text-transform:uppercase;">Health Care Services, LLC</div>
      <div style="height:2px;background:#c8991a;border-radius:1px;margin-top:14px;"></div>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:36px 32px;border-left:1px solid #dce2ec;border-right:1px solid #dce2ec;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background:#1a2e4a;border-radius:0 0 12px 12px;padding:18px 32px;text-align:center;">
      <div style="font-size:11px;color:#8e9ab0;">Bethel Divine Healthcare Services LLC &nbsp;·&nbsp; License R4205</div>
      <div style="font-size:11px;color:#8e9ab0;margin-top:4px;">Maryland Medicaid Provider &nbsp;·&nbsp; betheldivinehcs.com</div>
    </div>

  </div>
</body>
</html>`;
}

function h1(text: string) {
  return `<h1 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1a2e4a;margin:0 0 8px 0;">${text}</h1>`;
}
function h2(text: string) {
  return `<h2 style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1a2e4a;margin:28px 0 8px 0;">${text}</h2>`;
}
function p(text: string) {
  return `<p style="font-size:15px;line-height:1.6;color:#1a2e4a;margin:0 0 16px 0;">${text}</p>`;
}
function muted(text: string) {
  return `<p style="font-size:13px;color:#8e9ab0;margin:0 0 12px 0;">${text}</p>`;
}
function btn(label: string, href: string) {
  return `<div style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#1a2e4a;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">${label}</a>
  </div>`;
}
function divider() {
  return `<div style="height:1px;background:#dce2ec;margin:24px 0;"></div>`;
}
function badge(text: string, color: string, bg: string) {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;">${text}</span>`;
}

// ── Templates ────────────────────────────────────────────────────────────────

export function welcomeTemplate(data: { name: string; role: string; loginUrl: string }) {
  const roleName = data.role.charAt(0).toUpperCase() + data.role.slice(1);
  return {
    subject: "Your Bethel Divine account is ready",
    html: branded(`
      ${h1(`Welcome, ${data.name}!`)}
      ${p("Your Bethel Divine Healthcare Services account has been created and is ready to use.")}
      ${divider()}
      ${h2("Your Access Level")}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        ${badge(roleName, "#2d8a5e", "#f0faf5")}
      </div>
      ${p(`You have been assigned the <strong>${roleName}</strong> role, which gives you access to the features and dashboards relevant to your position.`)}
      ${btn("Sign In to Your Account", data.loginUrl)}
      ${muted("If you did not expect this email, please contact your administrator immediately.")}
    `),
  };
}

export function roleAssignedTemplate(data: { name: string; newRole: string; loginUrl: string }) {
  const roleName = data.newRole.charAt(0).toUpperCase() + data.newRole.slice(1);
  return {
    subject: "Your account access has been updated",
    html: branded(`
      ${h1("Account Access Updated")}
      ${p(`Hi ${data.name}, your access level on the Bethel Divine Healthcare portal has been updated.`)}
      ${divider()}
      ${h2("New Access Level")}
      <div style="margin-bottom:20px;">${badge(roleName, "#2d8a5e", "#f0faf5")}</div>
      ${p("Your dashboard and available features have been updated to reflect your new role. Please sign in to see your updated portal.")}
      ${btn("Sign In", data.loginUrl)}
      ${muted("If you believe this was a mistake, please contact your administrator.")}
    `),
  };
}

export function timeOffApprovedTemplate(data: {
  name: string;
  startDate: string;
  endDate: string;
  approvedBy: string;
}) {
  return {
    subject: `Time off approved — ${data.startDate} to ${data.endDate}`,
    html: branded(`
      ${h1("Time Off Approved")}
      ${p(`Hi ${data.name}, great news — your time off request has been approved.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;width:140px;">Start Date</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.startDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">End Date</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.endDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Approved By</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.approvedBy}</td>
        </tr>
      </table>
      ${p("Please log in to review your updated schedule and confirm any arrangements with your assigned clients are covered.")}
      ${muted("Remember to check your schedule when you return.")}
    `),
  };
}

export function timeOffDeniedTemplate(data: {
  name: string;
  startDate: string;
  endDate: string;
}) {
  return {
    subject: "Update on your time off request",
    html: branded(`
      ${h1("Time Off Request Update")}
      ${p(`Hi ${data.name}, we wanted to follow up on your time off request.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;width:140px;">Requested Dates</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.startDate} — ${data.endDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Status</td>
          <td style="padding:10px 0;">${badge("Not Approved", "#c0392b", "#fef2f2")}</td>
        </tr>
      </table>
      ${p("We were unable to approve your request for these dates due to scheduling requirements. We understand this may be inconvenient and appreciate your flexibility.")}
      ${p("Please reach out to your supervisor to discuss alternative dates or to better understand the scheduling constraints. We value your work and want to find a solution that works for everyone.")}
      ${muted("If you have an urgent need, please contact us directly.")}
    `),
  };
}

export function licenseExpiryTemplate(data: {
  name: string;
  licenseName: string;
  expiryDate: string;
  daysRemaining: number;
  licenseUrl: string;
}) {
  const urgency = data.daysRemaining <= 14 ? "#c0392b" : data.daysRemaining <= 30 ? "#c8991a" : "#1a2e4a";
  return {
    subject: `License expiring in ${data.daysRemaining} days — ${data.licenseName}`,
    html: branded(`
      ${h1("License Expiry Notice")}
      ${p(`Hi ${data.name}, this is a reminder that the following license will expire soon.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;width:140px;">License</td>
          <td style="padding:10px 0;font-size:15px;font-weight:700;color:#1a2e4a;">${data.licenseName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Expiry Date</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.expiryDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Days Remaining</td>
          <td style="padding:10px 0;font-size:18px;font-weight:700;color:${urgency};">${data.daysRemaining} days</td>
        </tr>
      </table>
      ${p("Please take action now to renew this license and upload the updated copy to the portal before it expires.")}
      ${btn("Manage Licenses", data.licenseUrl)}
      ${muted("Expired licenses may affect Medicaid billing eligibility. Renew promptly.")}
    `),
  };
}

export function licenseExpiredTemplate(data: {
  name: string;
  licenseName: string;
  expiryDate: string;
  licenseUrl: string;
}) {
  return {
    subject: `License expired — immediate action required`,
    html: branded(`
      <div style="background:#fef2f2;border-left:4px solid #c0392b;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <div style="font-weight:700;color:#c0392b;font-size:14px;">⚠ Immediate Action Required</div>
        <div style="font-size:13px;color:#c0392b;margin-top:4px;">This license has expired. Medicaid billing may be affected.</div>
      </div>
      ${h1("License Expired")}
      ${p(`Hi ${data.name}, the following license has expired and requires immediate renewal.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;width:140px;">License</td>
          <td style="padding:10px 0;font-size:15px;font-weight:700;color:#1a2e4a;">${data.licenseName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Expired On</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#c0392b;">${data.expiryDate}</td>
        </tr>
      </table>
      ${p("Please renew this license immediately and upload the updated certificate to the portal. Operating without a valid license may impact billing and compliance.")}
      ${btn("Update License Now", data.licenseUrl)}
    `),
  };
}

export function paymentReceiptTemplate(data: {
  name: string;
  amount: string;
  date: string;
  cardBrand: string;
  cardLastFour: string;
  billingMonth: string;
  paymentUrl: string;
}) {
  return {
    subject: "Payment confirmed — Bethel Divine Healthcare",
    html: branded(`
      <div style="background:#f0faf5;border-left:4px solid #2d8a5e;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <div style="font-weight:700;color:#2d8a5e;font-size:14px;">✓ Payment Successful</div>
      </div>
      ${h1("Payment Confirmed")}
      ${p(`Hi ${data.name}, your payment has been received. Thank you.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;width:160px;">Amount Paid</td>
          <td style="padding:10px 0;font-size:22px;font-weight:700;color:#2d8a5e;font-family:Georgia,serif;">$${data.amount}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Payment Date</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.date}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Method</td>
          <td style="padding:10px 0;font-size:14px;color:#1a2e4a;">${data.cardBrand} ending in ${data.cardLastFour}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Covers</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.billingMonth} care services</td>
        </tr>
      </table>
      ${p("We appreciate your prompt payment. It allows us to continue delivering high-quality care. View your full payment history in the portal.")}
      ${btn("View Payment History", data.paymentUrl)}
    `),
  };
}

export function paymentOverdueTemplate(data: {
  name: string;
  amount: string;
  dueDate: string;
  billingMonth: string;
  paymentUrl: string;
}) {
  return {
    subject: "Balance overdue — action required",
    html: branded(`
      <div style="background:#fef2f2;border-left:4px solid #c0392b;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <div style="font-weight:700;color:#c0392b;font-size:14px;">⚠ Balance Overdue</div>
        <div style="font-size:13px;color:#c0392b;margin-top:4px;">Please pay your balance as soon as possible to avoid service interruption.</div>
      </div>
      ${h1("Balance Overdue")}
      ${p(`Hi ${data.name}, your balance for ${data.billingMonth} is past due.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;width:160px;">Amount Due</td>
          <td style="padding:10px 0;font-size:22px;font-weight:700;color:#c0392b;font-family:Georgia,serif;">$${data.amount}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Was Due By</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#c0392b;">${data.dueDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Billing Month</td>
          <td style="padding:10px 0;font-size:14px;color:#1a2e4a;">${data.billingMonth}</td>
        </tr>
      </table>
      ${p("Please log in to your portal and pay your balance now. If you have questions about your bill or are experiencing financial difficulty, please contact us so we can assist you.")}
      ${btn("Pay Now", data.paymentUrl)}
    `),
  };
}

export function newUserRequestTemplate(data: {
  adminName: string;
  newUserName: string;
  newUserEmail: string;
  usersUrl: string;
}) {
  return {
    subject: `New account request — ${data.newUserName}`,
    html: branded(`
      ${h1("New Account Request")}
      ${p(`Hi ${data.adminName}, a new user has registered and is awaiting role assignment.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;width:140px;">Name</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.newUserName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Email</td>
          <td style="padding:10px 0;font-size:14px;color:#1a2e4a;">${data.newUserEmail}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Status</td>
          <td style="padding:10px 0;">${badge("Pending Review", "#c8991a", "#fef9ec")}</td>
        </tr>
      </table>
      ${p("Please review this request and assign the appropriate role so the user can access the portal.")}
      ${btn("Review Users", data.usersUrl)}
      ${muted("This user will not have portal access until a role is assigned.")}
    `),
  };
}

export function roleAssignedOwnerNotificationTemplate(data: {
  ownerName: string;
  userName: string;
  userEmail: string;
  newRole: string;
  assignedBy: string;
}) {
  const roleName = data.newRole.charAt(0).toUpperCase() + data.newRole.slice(1);
  return {
    subject: `User confirmed — ${data.userName} assigned as ${roleName}`,
    html: branded(`
      ${h1("User Role Confirmed")}
      ${p(`Hi ${data.ownerName}, a user account has been confirmed and assigned a role.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;width:140px;">Name</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.userName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Email</td>
          <td style="padding:10px 0;font-size:14px;color:#1a2e4a;">${data.userEmail}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Role Assigned</td>
          <td style="padding:10px 0;">${badge(roleName, "#2d8a5e", "#f0faf5")}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#8e9ab0;">Confirmed By</td>
          <td style="padding:10px 0;font-size:14px;color:#1a2e4a;">${data.assignedBy}</td>
        </tr>
      </table>
      ${muted("This is an informational notice. No action is required.")}
    `),
  };
}

// ── Care Plan Submitted ──────────────────────────────────────────────────────

const CP_ADL_TASKS = [
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

const CP_SERVICE_TASKS = [
  { key: "personal_care", label: "Personal Care / Hygiene" },
  { key: "companionship", label: "Companionship" },
  { key: "medication_reminders", label: "Medication Reminders" },
  { key: "meal_preparation", label: "Meal Preparation" },
  { key: "light_housekeeping", label: "Light Housekeeping" },
  { key: "transportation", label: "Transportation / Errands" },
];

function cpVal(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  if (v === undefined || v === null || v === "") return "—";
  return String(v);
}

function cpRow(label: string, value: string, shade = false): string {
  return `<tr style="background:${shade ? "#f7f9fc" : "#fff"};">
    <td style="padding:7px 10px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;width:38%;border-bottom:1px solid #dce2ec;vertical-align:top;">${label}</td>
    <td style="padding:7px 10px;font-size:13px;color:#1a2e4a;border-bottom:1px solid #dce2ec;">${value}</td>
  </tr>`;
}

function cpSection(title: string): string {
  return `<tr><td colspan="2" style="background:#2AADAD;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:7px 10px;">${title}</td></tr>`;
}

export function carePlanSubmittedTemplate(data: {
  formData: Record<string, unknown>;
  submissionId: string;
  submittedBy: string;
  submittedAt: string;
}) {
  const { formData, submissionId, submittedBy, submittedAt } = data;
  const clientName = cpVal(formData, "client_full_name");
  const printUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://betheldivine.com"}/print/care-plan/${submissionId}`;

  const safetyFlags = (formData["safety_flags"] as string[] | undefined) ?? [];
  const safetyStr = safetyFlags.length > 0 ? safetyFlags.join(", ") : "None indicated";

  const adlRows = CP_ADL_TASKS.map((t, i) =>
    cpRow(t.label, cpVal(formData, `adl_${t.key}`), i % 2 !== 0)
  ).join("");

  const serviceRows = CP_SERVICE_TASKS.map((s, i) => {
    const hours = cpVal(formData, `service_${s.key}_hours`);
    const days = (formData[`service_${s.key}_days`] as string[] | undefined) ?? [];
    return cpRow(s.label, `${hours !== "—" ? hours + " hrs/visit" : "—"} · ${days.length ? days.join(", ") : "—"}`, i % 2 !== 0);
  }).join("");

  return {
    subject: `New Care Plan Submitted — ${clientName}`,
    html: branded(`
      ${h1("New Client Care Plan Submitted")}
      ${p(`A care plan has been submitted for <strong>${clientName}</strong> through the Bethel Divine portal.`)}
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px;">
        <tr>
          <td style="padding:6px 0;color:#8e9ab0;width:140px;">Submitted by</td>
          <td style="padding:6px 0;font-weight:600;color:#1a2e4a;">${submittedBy}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#8e9ab0;">Date &amp; Time</td>
          <td style="padding:6px 0;color:#1a2e4a;">${submittedAt}</td>
        </tr>
      </table>
      <div style="margin:20px 0;">
        <a href="${printUrl}" style="display:inline-block;background:#2AADAD;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 28px;border-radius:8px;">
          ⬇&nbsp; View &amp; Download PDF
        </a>
      </div>
      ${divider()}

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        ${cpSection("1. Client Information")}
        ${cpRow("Client Full Name", cpVal(formData, "client_full_name"))}
        ${cpRow("Date of Birth", cpVal(formData, "date_of_birth"), true)}
        ${cpRow("Gender", cpVal(formData, "gender"))}
        ${cpRow("Medicaid / Medicare #", cpVal(formData, "medicaid_number"), true)}
        ${cpRow("Address", `${cpVal(formData, "address")}, ${cpVal(formData, "city")}, ${cpVal(formData, "state")} ${cpVal(formData, "zip_code")}`)}
        ${cpRow("Primary Phone", cpVal(formData, "primary_phone"), true)}
        ${cpRow("Emergency Contact", `${cpVal(formData, "emergency_contact_name")} (${cpVal(formData, "emergency_relationship")}) — ${cpVal(formData, "emergency_phone")}`)}
        ${cpRow("Primary Physician", `${cpVal(formData, "physician_name")} — ${cpVal(formData, "physician_phone")}`, true)}
        ${cpRow("Date of Assessment", cpVal(formData, "assessment_date"))}
        ${cpRow("Care Plan Start Date", cpVal(formData, "care_plan_start_date"), true)}

        ${cpSection("2. Diagnoses & Medical History")}
        ${cpRow("Primary Diagnosis", `${cpVal(formData, "primary_diagnosis")} (${cpVal(formData, "icd10_code")})`)}
        ${cpRow("Secondary Diagnosis", cpVal(formData, "secondary_diagnosis"), true)}
        ${cpRow("Known Allergies", cpVal(formData, "known_allergies"))}
        ${cpRow("Medical / Surgical History", cpVal(formData, "medical_history"), true)}

        ${cpSection("3. Activities of Daily Living")}
        ${adlRows}

        ${cpSection("4. Client Care Goals")}
        ${[1, 2, 3].map((n, i) => cpRow(`Goal ${n}`, `${cpVal(formData, `goal_${n}`)} — ${cpVal(formData, `goal_${n}_target_date`)} (${cpVal(formData, `goal_${n}_status`)})`, i % 2 !== 0)).join("")}

        ${cpSection("5. Scheduled Services")}
        ${serviceRows}

        ${cpSection("6. Safety Considerations")}
        ${cpRow("Safety Flags", safetyStr)}
        ${cpRow("Additional Safety Notes", cpVal(formData, "safety_notes"), true)}

        ${cpSection("7. Communication & Preferences")}
        ${cpRow("Preferred Language", cpVal(formData, "preferred_language"))}
        ${cpRow("Preferred Name", cpVal(formData, "preferred_name"), true)}
        ${cpRow("Religious / Cultural Preferences", cpVal(formData, "cultural_preferences"))}
        ${cpRow("Likes / Preferences", cpVal(formData, "likes_preferences"), true)}
        ${cpRow("Dislikes / Triggers", cpVal(formData, "dislikes_triggers"))}

        ${cpSection("8. Caregiver Notes")}
        ${cpRow("Notes", cpVal(formData, "caregiver_notes"))}

        ${cpSection("9. Signatures")}
        ${cpRow("Client / Guardian", `${cpVal(formData, "client_signature")} — ${cpVal(formData, "client_signature_date")}`)}
        ${cpRow("Care Coordinator", `${cpVal(formData, "coordinator_signature")} (${cpVal(formData, "coordinator_printed_name")}) — ${cpVal(formData, "coordinator_signature_date")}`, true)}
        ${cpRow("Caregiver / Aide", `${cpVal(formData, "caregiver_signature")} (${cpVal(formData, "caregiver_printed_name")}) — ${cpVal(formData, "caregiver_signature_date")}`)}
      </table>

      ${divider()}
      ${muted("This email was automatically generated when a care plan was submitted in the Bethel Divine portal. The full print-ready PDF is available at the link above.")}
    `),
  };
}

export function invoiceTemplate(data: {
  name: string;
  billingMonth: string;
  visits: { date: string; caregiver: string; hours: number; rate: number; subtotal: number }[];
  total: number;
  dueDate: string;
  paymentUrl: string;
}) {
  const rows = data.visits
    .map(
      (v) => `
    <tr style="border-bottom:1px solid #dce2ec;">
      <td style="padding:10px 8px;font-size:13px;color:#1a2e4a;">${v.date}</td>
      <td style="padding:10px 8px;font-size:13px;color:#1a2e4a;">${v.caregiver}</td>
      <td style="padding:10px 8px;font-size:13px;text-align:center;color:#1a2e4a;">${v.hours.toFixed(2)}</td>
      <td style="padding:10px 8px;font-size:13px;text-align:right;color:#8e9ab0;">$${v.rate.toFixed(2)}/hr</td>
      <td style="padding:10px 8px;font-size:13px;font-weight:600;text-align:right;color:#1a2e4a;">$${v.subtotal.toFixed(2)}</td>
    </tr>`
    )
    .join("");

  return {
    subject: `Invoice from Bethel Divine Healthcare — ${data.billingMonth}`,
    html: branded(`
      ${h1(`Invoice — ${data.billingMonth}`)}
      ${p(`Hi ${data.name}, please find your invoice for care services rendered during ${data.billingMonth}.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr style="border-bottom:2px solid #1a2e4a;">
            <th style="padding:10px 8px;font-size:12px;font-weight:700;text-align:left;color:#8e9ab0;text-transform:uppercase;letter-spacing:0.5px;">Date</th>
            <th style="padding:10px 8px;font-size:12px;font-weight:700;text-align:left;color:#8e9ab0;text-transform:uppercase;letter-spacing:0.5px;">Caregiver</th>
            <th style="padding:10px 8px;font-size:12px;font-weight:700;text-align:center;color:#8e9ab0;text-transform:uppercase;letter-spacing:0.5px;">Hours</th>
            <th style="padding:10px 8px;font-size:12px;font-weight:700;text-align:right;color:#8e9ab0;text-transform:uppercase;letter-spacing:0.5px;">Rate</th>
            <th style="padding:10px 8px;font-size:12px;font-weight:700;text-align:right;color:#8e9ab0;text-transform:uppercase;letter-spacing:0.5px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="border-top:2px solid #1a2e4a;background:#f7f9fc;">
            <td colspan="4" style="padding:14px 8px;font-size:15px;font-weight:700;color:#1a2e4a;">Total Due</td>
            <td style="padding:14px 8px;font-size:18px;font-weight:700;text-align:right;color:#1a2e4a;font-family:Georgia,serif;">$${data.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#8e9ab0;width:120px;">Due Date</td>
          <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a2e4a;">${data.dueDate}</td>
        </tr>
      </table>
      ${btn("Pay Invoice Now", data.paymentUrl)}
      ${muted("Questions about this invoice? Contact us at billing@betheldivine.com")}
    `),
  };
}
