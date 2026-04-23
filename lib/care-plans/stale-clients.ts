/**
 * getCarePlanAlertData
 *
 * Server-side data fetch for the Care Plan Status widget on the Owner and Admin
 * dashboards. Runs 3 efficient queries (no raw SQL function required):
 *
 *   1. Active client profiles  (profiles WHERE role='client' AND is_active=true)
 *   2. Client records          (clients WHERE profile_id IN [...])
 *   3. Latest care plan date   (care_plan_documents WHERE client_id IN [...], newest-first)
 *
 * Classification (per client):
 *   NO_PLAN  — zero care_plan_documents rows for this client_id
 *   STALE    — most recent submitted_at is 60+ days ago
 *   CURRENT  — most recent submitted_at is less than 60 days ago (not returned)
 *
 * Prerequisite: care_plan_documents.client_id must be populated for a client to
 * be recognised as having a plan. Rows where client_id IS NULL (legacy submissions
 * before the UUID linkage was added) do not count toward any client's plan history.
 *
 * Uses the service-role client so RLS never filters out rows.
 */

import { createClient as createServiceClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CarePlanStatus = "no_plan" | "stale" | "current";

export interface ClientCarePlanSummary {
  /** care_plan_documents.client_id / clients.id */
  clientId: string;
  /** profiles.id */
  profileId: string;
  clientName: string;
  /** Days since clients.created_at — used to sort NO_PLAN clients */
  daysSinceAdded: number;
  /** ISO string of MAX(submitted_at), null when no plan exists */
  lastPlanSubmittedAt: string | null;
  /** Days since last plan, null when no plan exists */
  daysSincePlan: number | null;
  status: CarePlanStatus;
}

export interface CarePlanAlertData {
  /** Clients with status === 'no_plan', sorted by daysSinceAdded DESC (oldest first) */
  noPlans: ClientCarePlanSummary[];
  /** Clients with status === 'stale', sorted by daysSincePlan DESC (oldest plan first) */
  stalePlans: ClientCarePlanSummary[];
  /** Total number of active clients (regardless of plan status) */
  totalActive: number;
  /** True when noPlans and stalePlans are both empty */
  allCurrent: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STALE_THRESHOLD_DAYS = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getCarePlanAlertData(): Promise<CarePlanAlertData> {
  const service = getServiceClient();
  const now = new Date();

  // ── 1. All active client profiles ────────────────────────────────────────
  const { data: clientProfiles, error: profilesError } = await service
    .from("profiles")
    .select("id, full_name")
    .eq("role", "client")
    .eq("is_active", true);

  if (profilesError || !clientProfiles?.length) {
    return { noPlans: [], stalePlans: [], totalActive: 0, allCurrent: true };
  }

  const profileIds = clientProfiles.map((p) => p.id);
  const profileMap = new Map(clientProfiles.map((p) => [p.id, p]));

  // ── 2. Client rows (clients.id is the FK used in care_plan_documents) ────
  // suppress_care_plan_alert = true means the owner/admin has explicitly
  // opted that client out of dashboard alerts.
  const { data: clientRows, error: clientsError } = await service
    .from("clients")
    .select("id, profile_id, created_at, suppress_care_plan_alert")
    .in("profile_id", profileIds)
    .eq("suppress_care_plan_alert", false);

  if (clientsError || !clientRows?.length) {
    return { noPlans: [], stalePlans: [], totalActive: 0, allCurrent: true };
  }

  const clientIds = clientRows.map((c) => c.id);

  // ── 3. Latest care plan per client ───────────────────────────────────────
  // Fetch submitted_at for all matching docs, ordered newest-first.
  // First occurrence per client_id in the iteration = that client's latest plan.
  const { data: docs } = clientIds.length
    ? await service
        .from("care_plan_documents")
        .select("client_id, submitted_at")
        .in("client_id", clientIds)
        .not("client_id", "is", null)
        .order("submitted_at", { ascending: false })
    : { data: [] };

  const latestPlanMap = new Map<string, string>();
  for (const doc of docs ?? []) {
    if (doc.client_id && !latestPlanMap.has(doc.client_id)) {
      latestPlanMap.set(doc.client_id, doc.submitted_at as string);
    }
  }

  // ── 4. Classify ───────────────────────────────────────────────────────────
  const summaries: ClientCarePlanSummary[] = clientRows.map((c) => {
    const profile = profileMap.get(c.profile_id);
    const lastPlan = latestPlanMap.get(c.id) ?? null;
    const daysSinceAdded = daysBetween(new Date(c.created_at as string), now);
    const daysSincePlan = lastPlan
      ? daysBetween(new Date(lastPlan), now)
      : null;

    const status: CarePlanStatus =
      lastPlan === null
        ? "no_plan"
        : daysSincePlan! >= STALE_THRESHOLD_DAYS
        ? "stale"
        : "current";

    return {
      clientId: c.id as string,
      profileId: c.profile_id as string,
      clientName: profile?.full_name ?? "Unknown Client",
      daysSinceAdded,
      lastPlanSubmittedAt: lastPlan,
      daysSincePlan,
      status,
    };
  });

  const noPlans = summaries
    .filter((s) => s.status === "no_plan")
    .sort((a, b) => b.daysSinceAdded - a.daysSinceAdded); // oldest (most overdue) first

  const stalePlans = summaries
    .filter((s) => s.status === "stale")
    .sort((a, b) => (b.daysSincePlan ?? 0) - (a.daysSincePlan ?? 0)); // oldest plan first

  return {
    noPlans,
    stalePlans,
    totalActive: clientRows.length,
    allCurrent: noPlans.length === 0 && stalePlans.length === 0,
  };
}
