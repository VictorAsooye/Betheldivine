"use client";

import { useState } from "react";

const NAVY = "#1a2e4a";
const TEAL = "#2AADAD";
const BORDER = "#dce2ec";
const GRAY = "#8e9ab0";

// ─── Guide content per role ────────────────────────────────────────────────

interface Section {
  heading: string;
  status?: "live" | "coming-soon";
  steps: string[];
}

interface Guide {
  title: string;
  icon: string;
  description: string;
  roles: string[];
  sections: Section[];
}

const GUIDES: Guide[] = [
  // ── ADMIN ──────────────────────────────────────────────────
  {
    title: "Admin Overview",
    icon: "🛡️",
    description: "Full platform guide for administrators.",
    roles: ["admin"],
    sections: [
      {
        heading: "Logging In",
        status: "live",
        steps: [
          "Go to betheldivine.com and click Sign In.",
          "Enter your admin email and password.",
          "You will be taken directly to the Admin Dashboard.",
          "To sign out, click 'Sign out' at the bottom of the sidebar.",
        ],
      },
      {
        heading: "Managing Users",
        status: "live",
        steps: [
          "Click 'Users' in the left sidebar.",
          "You can view all registered staff and clients here.",
          "Pending users (who registered but haven't been approved) show with a 'Pending' badge.",
          "Click a user to update their role (admin, owner, employee, client) or approve their account.",
          "Changing a user's role takes effect immediately — they will see the updated dashboard on next login.",
        ],
      },
      {
        heading: "Documents",
        status: "live",
        steps: [
          "Click 'Documents' in the sidebar.",
          "Create a Library (folder) to organise files — click 'New Library', give it a name and optional description.",
          "Click into a library then use 'Upload to Library' to add PDFs, images, or Word files (up to 20 MB).",
          "Click any file row to open a full preview (PDFs and images display inline).",
          "Hover a file name and click the pencil icon to rename it inline — press Enter or click away to save.",
          "Use the 'Share' button to copy a 24-hour public link to the file.",
          "Use 'Download' to save a file to your device.",
          "Use 'Delete' to permanently remove a file.",
        ],
      },
      {
        heading: "Forms — Client Care Plan",
        status: "live",
        steps: [
          "Click 'Forms' in the sidebar.",
          "You will see the Client Care Plan form card.",
          "Click 'Fill Out Form' to open the fillable form.",
          "Fields marked with a red * are required — the form will not submit until all required fields are filled.",
          "After submitting, you land on a success screen with a 'Download PDF' button.",
          "Clicking 'Download PDF' opens a print-ready page — use your browser's Print → Save as PDF to save the file.",
          "As an admin, click 'View Submissions' on the form card to see all submitted care plans.",
          "Each submission row in the list also has a 'PDF' link to download that specific submission.",
        ],
      },
      {
        heading: "Licenses",
        status: "live",
        steps: [
          "Click 'Licenses' in the sidebar to view all staff licenses and certifications on file.",
        ],
      },
      {
        heading: "Payments",
        status: "live",
        steps: [
          "Click 'Payments' in the sidebar to view payment records.",
        ],
      },
      {
        heading: "Audit Log",
        status: "live",
        steps: [
          "Click 'Audit Log' to view a history of actions taken in the system.",
        ],
      },
      {
        heading: "Reports",
        status: "coming-soon",
        steps: [
          "Reports generation is coming soon. This will allow you to export data and summaries across the platform.",
        ],
      },
      {
        heading: "Settings",
        status: "live",
        steps: [
          "Click 'Settings' to manage platform-level configurations.",
        ],
      },
    ],
  },

  // ── OWNER ──────────────────────────────────────────────────
  {
    title: "Owner Overview",
    icon: "🏢",
    description: "Operations guide for owners.",
    roles: ["owner", "admin"],
    sections: [
      {
        heading: "Logging In",
        status: "live",
        steps: [
          "Go to betheldivine.com and sign in with your owner credentials.",
          "You'll be taken to the Owner Dashboard.",
          "Use the sidebar to navigate between sections.",
        ],
      },
      {
        heading: "Documents",
        status: "live",
        steps: [
          "Click 'Documents' to manage files.",
          "Create libraries to organise documents by client, employee, or category.",
          "Upload PDFs, images, or Word files (up to 20 MB).",
          "Click any file to preview it. Use 'Share' to copy a 24-hour link, 'Download' to save, or hover the filename and click the pencil to rename.",
        ],
      },
      {
        heading: "Forms — Client Care Plan",
        status: "live",
        steps: [
          "Click 'Forms' to access the Client Care Plan.",
          "Click 'Fill Out Form' to complete a care plan for a client.",
          "Fill all required fields (marked with *) and submit.",
          "After submission, download a PDF copy for your records.",
          "Click 'View Submissions' to see all care plans that have been submitted.",
        ],
      },
      {
        heading: "Licenses",
        status: "live",
        steps: [
          "Click 'Licenses' to view staff certifications and license records.",
        ],
      },
      {
        heading: "Payments",
        status: "live",
        steps: [
          "Click 'Payments' to view payment history and records.",
        ],
      },
      {
        heading: "Employees",
        status: "coming-soon",
        steps: [
          "Full employee management (adding, scheduling, tracking) is being built and will be available soon.",
        ],
      },
      {
        heading: "Clients",
        status: "coming-soon",
        steps: [
          "Client management (profiles, care history, assignments) is being built and will be available soon.",
        ],
      },
      {
        heading: "Schedule",
        status: "coming-soon",
        steps: [
          "Scheduling features for shift management and caregiver assignments are coming soon.",
        ],
      },
      {
        heading: "Time Off",
        status: "coming-soon",
        steps: [
          "Time off request management for employees is coming soon.",
        ],
      },
    ],
  },

  // ── EMPLOYEE ───────────────────────────────────────────────
  {
    title: "Employee Overview",
    icon: "👤",
    description: "Day-to-day guide for care employees.",
    roles: ["employee", "admin"],
    sections: [
      {
        heading: "Logging In",
        status: "live",
        steps: [
          "Go to betheldivine.com and sign in with your employee credentials.",
          "If your account is new, you may see a 'Pending Approval' screen — your admin will approve you shortly.",
          "Once approved you'll land on your Employee Dashboard.",
        ],
      },
      {
        heading: "Documents",
        status: "live",
        steps: [
          "Click 'Documents' in the sidebar.",
          "Browse libraries and files shared with you.",
          "Click any document row to preview it (PDFs and images display inline).",
          "Use 'Download' to save a document to your device.",
          "Use 'Share' to copy a 24-hour public link to send to someone outside the portal.",
        ],
      },
      {
        heading: "Forms — Client Care Plan",
        status: "live",
        steps: [
          "Click 'Forms' in the sidebar.",
          "Click 'Fill Out Form' on the Client Care Plan card.",
          "Complete all sections — required fields are marked with a red *.",
          "Click 'Submit Care Plan' when done.",
          "On the success screen, click 'Download PDF' to save a print-ready copy of the plan.",
          "Use your browser's Print → Save as PDF to save the file.",
        ],
      },
      {
        heading: "My Licenses",
        status: "live",
        steps: [
          "Click 'My Licenses' to view your certifications and license records on file.",
        ],
      },
      {
        heading: "My Schedule",
        status: "coming-soon",
        steps: [
          "Your shift schedule will be visible here once scheduling features are live.",
        ],
      },
      {
        heading: "My Clients",
        status: "coming-soon",
        steps: [
          "Your assigned client list and profiles will appear here once client management is live.",
        ],
      },
      {
        heading: "Medication Logs",
        status: "coming-soon",
        steps: [
          "Logging medication reminders and observations is coming soon.",
        ],
      },
      {
        heading: "Time Off",
        status: "coming-soon",
        steps: [
          "You will be able to submit time-off requests here once this feature is live.",
        ],
      },
    ],
  },
];

// ─── Modal ─────────────────────────────────────────────────────────────────

function GuideModal({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10,20,40,0.7)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "min(720px, 95vw)", maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ backgroundColor: NAVY, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "22px" }}>{guide.icon}</span>
            <div>
              <h2
                style={{
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 700,
                  fontFamily: "var(--font-lora), Georgia, serif",
                  margin: 0,
                }}
              >
                {guide.title}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0, fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
                {guide.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              padding: "4px",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "24px 28px" }}>
          {guide.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: "28px" }}>
              {/* Section title */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  style={{
                    backgroundColor: TEAL,
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    padding: "5px 12px",
                    borderRadius: "3px",
                    fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {section.heading}
                </div>
                {section.status === "coming-soon" && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#92400e",
                      backgroundColor: "#fef3c7",
                      border: "1px solid #fcd34d",
                      borderRadius: "12px",
                      padding: "2px 8px",
                      fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ⏳ Coming Soon
                  </span>
                )}
                {section.status === "live" && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#166534",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: "12px",
                      padding: "2px 8px",
                      fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✓ Live
                  </span>
                )}
              </div>

              {/* Steps */}
              <ol style={{ margin: 0, paddingLeft: "20px" }}>
                {section.steps.map((step, j) => (
                  <li
                    key={j}
                    style={{
                      fontSize: "13px",
                      color: section.status === "coming-soon" ? GRAY : NAVY,
                      lineHeight: "1.65",
                      marginBottom: "6px",
                      fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                      fontStyle: section.status === "coming-soon" ? "italic" : "normal",
                    }}
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {/* Footer note */}
          <div
            style={{
              marginTop: "8px",
              padding: "12px 14px",
              backgroundColor: "#f7f9fc",
              borderRadius: "6px",
              border: `1px solid ${BORDER}`,
              fontSize: "11px",
              color: GRAY,
              fontFamily: "var(--font-source-sans), system-ui, sans-serif",
              lineHeight: "1.5",
            }}
          >
            This guide reflects the current state of the Bethel Divine portal. Features marked "Coming Soon" are under active development. Contact your administrator if you have questions.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

interface Props {
  role: string;
}

export default function HowToGuides({ role }: Props) {
  const [openGuide, setOpenGuide] = useState<Guide | null>(null);

  const relevantGuides = GUIDES.filter((g) => g.roles.includes(role));

  if (relevantGuides.length === 0) return null;

  return (
    <>
      <div style={{ marginBottom: "24px" }}>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <h2
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: GRAY,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: 0,
              fontFamily: "var(--font-source-sans), system-ui, sans-serif",
            }}
          >
            How To Guides
          </h2>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "#166534",
              backgroundColor: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "10px",
              padding: "1px 7px",
              fontFamily: "var(--font-source-sans), system-ui, sans-serif",
            }}
          >
            Built-in
          </span>
        </div>

        {/* Guide cards */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {relevantGuides.map((guide) => (
            <button
              key={guide.title}
              onClick={() => setOpenGuide(guide)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 18px",
                backgroundColor: "#fff",
                border: `1px solid ${BORDER}`,
                borderRadius: "12px",
                cursor: "pointer",
                textAlign: "left",
                transition: "box-shadow 0.15s, border-color 0.15s",
                minWidth: "220px",
                maxWidth: "300px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(42,173,173,0.12)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = TEAL;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#e8f8f8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                {guide.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    fontWeight: 700,
                    color: NAVY,
                    fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                  }}
                >
                  {guide.title}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "11px",
                    color: GRAY,
                    fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {guide.description}
                </p>
              </div>

              {/* Arrow */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GRAY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Guide modal */}
      {openGuide && (
        <GuideModal guide={openGuide} onClose={() => setOpenGuide(null)} />
      )}
    </>
  );
}
