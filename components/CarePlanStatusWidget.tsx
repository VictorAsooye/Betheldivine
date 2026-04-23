"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { suppressCarePlanAlert } from "@/lib/care-plans/suppress-action";
import type {
  CarePlanAlertData,
  ClientCarePlanSummary,
} from "@/lib/care-plans/stale-clients";

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_VISIBLE = 5;
const NAVY = "#1a2e4a";
const BORDER = "#dce2ec";

// Widget is dismissed for 24 h when the user clicks X.
// Key is date-scoped so it auto-resets each day.
function dismissKey() {
  return `care-plan-widget-dismissed-${new Date().toISOString().slice(0, 10)}`;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  data: CarePlanAlertData;
  role: "owner" | "admin";
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function plural(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? "s" : ""}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({
  color,
  dotColor,
  bgColor,
  label,
  count,
}: {
  color: string;
  dotColor: string;
  bgColor: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <p
        className="text-xs font-bold font-sans uppercase tracking-wider"
        style={{ color }}
      >
        {label}
      </p>
      <span
        className="text-xs font-semibold font-sans px-1.5 py-0.5 rounded"
        style={{ backgroundColor: bgColor, color }}
      >
        {count}
      </span>
    </div>
  );
}

function ClientRow({
  client,
  formHref,
  buttonLabel,
  urgency,
  onIgnore,
  ignoring,
}: {
  client: ClientCarePlanSummary;
  formHref: string;
  buttonLabel: string;
  urgency: "red" | "amber";
  onIgnore: () => void;
  ignoring: boolean;
}) {
  const btnBg = urgency === "red" ? "#c0392b" : "#b8860b";
  const subtext =
    urgency === "red"
      ? `Added ${plural(client.daysSinceAdded, "day")} ago`
      : `Last plan: ${fmtDate(client.lastPlanSubmittedAt!)} · ${plural(
          client.daysSincePlan!,
          "day"
        )} ago`;

  return (
    <div
      className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0"
      style={{ borderColor: BORDER }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold font-sans truncate"
          style={{ color: NAVY }}
        >
          {client.clientName}
        </p>
        <p className="text-xs font-sans mt-0.5" style={{ color: "#8e9ab0" }}>
          {subtext}
        </p>
      </div>

      <button
        onClick={onIgnore}
        disabled={ignoring}
        className="text-xs font-sans shrink-0 px-2 py-1 rounded transition-colors"
        style={{ color: "#8e9ab0" }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "#c0392b")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "#8e9ab0")
        }
        title="Stop showing this client in care plan alerts"
      >
        {ignoring ? "Ignoring…" : "Ignore"}
      </button>

      <Link
        href={formHref}
        className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-85"
        style={{ backgroundColor: btnBg, color: "#ffffff" }}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CarePlanStatusWidget({ data, role }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [noPlans, setNoPlans] = useState<ClientCarePlanSummary[]>(data.noPlans);
  const [stalePlans, setStalePlans] = useState<ClientCarePlanSummary[]>(data.stalePlans);
  const [ignoringId, setIgnoringId] = useState<string | null>(null);

  // Check localStorage on mount — dismissed state persists for the calendar day
  useEffect(() => {
    if (localStorage.getItem(dismissKey()) === "1") {
      setDismissed(true);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(dismissKey(), "1");
    setDismissed(true);
  }

  async function handleIgnore(clientId: string, section: "no_plan" | "stale") {
    setIgnoringId(clientId);
    try {
      await suppressCarePlanAlert(clientId);
      if (section === "no_plan") {
        setNoPlans((prev) => prev.filter((c) => c.clientId !== clientId));
      } else {
        setStalePlans((prev) => prev.filter((c) => c.clientId !== clientId));
      }
    } catch {
      // Silently fail — worst case the row stays visible until next page load
    } finally {
      setIgnoringId(null);
    }
  }

  if (dismissed) return null;

  const { totalActive, allCurrent } = data;
  const formBase = `/${role}/forms?open=client_care_plan`;
  const docsHref = `/${role}/documents/care-plans`;
  const totalAlert = noPlans.length + stalePlans.length;
  const effectivelyAllCurrent = allCurrent || totalAlert === 0;

  // ── State 1: Everything current ──────────────────────────────────────────
  if (effectivelyAllCurrent) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-xl border px-5 py-4 mb-6"
        style={{ backgroundColor: "#f0faf5", borderColor: "#a7dfc4" }}
      >
        <div className="flex items-center gap-3">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2d8a5e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-sm font-sans" style={{ color: "#2d8a5e" }}>
            <span className="font-semibold">All care plans current ✓</span>
            {totalActive > 0 && (
              <span className="ml-2 opacity-80">
                {plural(totalActive, "active client")}, all with plans updated
                in the last 60 days
              </span>
            )}
            {totalActive === 0 && (
              <span className="ml-2 opacity-80">
                No active clients found — add clients to start tracking care
                plans
              </span>
            )}
          </p>
        </div>
        <Link
          href={docsHref}
          className="text-xs font-semibold font-sans shrink-0 hover:underline"
          style={{ color: "#2d8a5e" }}
        >
          View care plans →
        </Link>
      </div>
    );
  }

  // ── State 2: Attention needed ────────────────────────────────────────────
  const visibleNoPlans = noPlans.slice(0, MAX_VISIBLE);
  const visibleStale = stalePlans.slice(0, MAX_VISIBLE);
  const extraNoPlans = noPlans.length - visibleNoPlans.length;
  const extraStale = stalePlans.length - visibleStale.length;

  return (
    <div
      className="rounded-xl border mb-6 overflow-hidden"
      style={{ borderColor: BORDER, backgroundColor: "#ffffff" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: BORDER }}
      >
        <h2
          className="text-base font-semibold"
          style={{
            color: NAVY,
            fontFamily: "var(--font-lora), Georgia, serif",
          }}
        >
          Care plans needing attention
        </h2>

        {/* X dismiss button */}
        <button
          onClick={handleDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          style={{ color: "#8e9ab0" }}
          title="Dismiss for today"
          aria-label="Dismiss care plan alerts for today"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* ── Section A: No plan ── */}
        {noPlans.length > 0 && (
          <div>
            <SectionLabel
              color="#c0392b"
              dotColor="#c0392b"
              bgColor="#fef2f2"
              label="No care plan on file"
              count={noPlans.length}
            />
            <div>
              {visibleNoPlans.map((client) => (
                <ClientRow
                  key={client.clientId}
                  client={client}
                  formHref={`${formBase}&prefill_name=${encodeURIComponent(
                    client.clientName
                  )}`}
                  buttonLabel="Create care plan"
                  urgency="red"
                  onIgnore={() => handleIgnore(client.clientId, "no_plan")}
                  ignoring={ignoringId === client.clientId}
                />
              ))}
            </div>
            {extraNoPlans > 0 && (
              <Link
                href={docsHref}
                className="text-xs font-semibold font-sans mt-2 inline-block hover:underline"
                style={{ color: "#c0392b" }}
              >
                View all ({noPlans.length}) →
              </Link>
            )}
          </div>
        )}

        {/* ── Section B: Stale ── */}
        {stalePlans.length > 0 && (
          <div>
            <SectionLabel
              color="#b8860b"
              dotColor="#c8991a"
              bgColor="#fffbeb"
              label="Plans over 60 days old"
              count={stalePlans.length}
            />
            <div>
              {visibleStale.map((client) => (
                <ClientRow
                  key={client.clientId}
                  client={client}
                  formHref={`${formBase}&prefill_name=${encodeURIComponent(
                    client.clientName
                  )}`}
                  buttonLabel="Update care plan"
                  urgency="amber"
                  onIgnore={() => handleIgnore(client.clientId, "stale")}
                  ignoring={ignoringId === client.clientId}
                />
              ))}
            </div>
            {extraStale > 0 && (
              <Link
                href={docsHref}
                className="text-xs font-semibold font-sans mt-2 inline-block hover:underline"
                style={{ color: "#b8860b" }}
              >
                View all ({stalePlans.length}) →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
