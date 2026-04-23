/**
 * CarePlanStatusWidget
 *
 * Server Component — rendered at page load, zero client JS.
 * Displays two states:
 *
 *   ALL CURRENT — single compact green bar, no list.
 *   ATTENTION NEEDED — card with two sections (no plan / stale),
 *     max 5 rows each, "View all (N) →" link if more exist.
 *
 * "Create / Update care plan" buttons deep-link to the role-specific
 * Forms page with ?open=client_care_plan&prefill_name=<name> so the
 * form opens pre-populated with that client's name.
 */

import Link from "next/link";
import type {
  CarePlanAlertData,
  ClientCarePlanSummary,
} from "@/lib/care-plans/stale-clients";

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_VISIBLE = 5;
const NAVY = "#1a2e4a";
const BORDER = "#dce2ec";

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  data: CarePlanAlertData;
  /** Used to build role-scoped hrefs (e.g. /owner/forms, /admin/forms) */
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
}: {
  client: ClientCarePlanSummary;
  formHref: string;
  buttonLabel: string;
  urgency: "red" | "amber";
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
      className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0"
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
  const { noPlans, stalePlans, totalActive, allCurrent } = data;

  const formBase = `/${role}/forms?open=client_care_plan`;
  const docsHref = `/${role}/documents/care-plans`;

  // ── State 1: Everything current (or no clients table rows yet) ──────────
  if (allCurrent) {
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
                No active clients found — add clients to start tracking care plans
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/${role}/documents/care-plans`}
          className="text-xs font-semibold font-sans shrink-0 hover:underline"
          style={{ color: "#2d8a5e" }}
        >
          View care plans →
        </Link>
      </div>
    );
  }

  // ── State 2: Attention needed ────────────────────────────────────────────
  const totalAlert = noPlans.length + stalePlans.length;
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
        <span
          className="text-xs font-bold font-sans px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "#fef2f2", color: "#c0392b" }}
        >
          {totalAlert}
        </span>
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
