import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import PageShell from "@/components/layout/PageShell";
import { getCarePlanAlertData } from "@/lib/care-plans/stale-clients";
import {
  AlertTriangle,
  FileText,
  FolderOpen,
  Shield,
  Mail,
  Activity,
} from "lucide-react";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusFromExpiry(expiry: string): "expired" | "soon" | "current" {
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "current";
}

function expiryBadge(expiry: string) {
  const s = statusFromExpiry(expiry);
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (s === "expired") return { cls: "bg-danger-bg text-danger-text", dot: "#991B1B", label: `${Math.abs(days)}d overdue` };
  if (s === "soon") return { cls: "bg-warning-bg text-warning-text", dot: "#92400E", label: `${days}d left` };
  return { cls: "bg-success-bg text-success-text", dot: "#065F46", label: `${days}d left` };
}

interface AuditRow {
  id: string;
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  actor_id: string | null;
}

interface LicenseRow {
  id: string;
  license_name: string;
  expiry_date: string;
  profiles?: { full_name?: string } | null;
}

const auditIcon: Record<string, { Icon: typeof FileText; bg: string; text: string }> = {
  form_submitted: { Icon: FileText, bg: "bg-info-bg", text: "text-info-text" },
  form_sent: { Icon: FileText, bg: "bg-info-bg", text: "text-info-text" },
  document_uploaded: { Icon: FolderOpen, bg: "bg-success-bg", text: "text-success-text" },
  license_created: { Icon: Shield, bg: "bg-warning-bg", text: "text-warning-text" },
  EMAIL_SENT: { Icon: Mail, bg: "bg-slateWash", text: "text-slate" },
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const profilePromise = user
    ? service.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : Promise.resolve({ data: null });

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    profileRes,
    { count: formCount },
    { count: submissionsThisWeek },
    { count: licenseCount },
    { count: licenseAttention },
    { count: documentCount },
    { count: folderCount },
    { data: expiringLicenses },
    { data: auditLogs },
    carePlanData,
  ] = await Promise.all([
    profilePromise,
    service.from("forms").select("*", { count: "exact", head: true }).eq("is_active", true),
    service.from("form_submissions").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    service.from("licenses").select("*", { count: "exact", head: true }),
    service.from("licenses").select("*", { count: "exact", head: true }).in("status", ["expiring_soon", "expired"]),
    service.from("documents").select("*", { count: "exact", head: true }),
    service.from("document_folders").select("*", { count: "exact", head: true }),
    service
      .from("licenses")
      .select("id, license_name, expiry_date, profiles!licenses_holder_id_fkey(full_name)")
      .order("expiry_date", { ascending: true })
      .limit(4),
    service
      .from("audit_logs")
      .select("id, action, created_at, metadata, actor_id")
      .order("created_at", { ascending: false })
      .limit(5),
    getCarePlanAlertData(),
  ]);

  const profile = (profileRes as { data: { full_name?: string } | null }).data;
  const licenses = (expiringLicenses as LicenseRow[] | null) ?? [];
  const logs = (auditLogs as AuditRow[] | null) ?? [];

  const actorIds = Array.from(new Set(logs.map((l) => l.actor_id).filter(Boolean))) as string[];
  const { data: actors } = actorIds.length
    ? await service.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const actorMap = new Map(((actors as { id: string; full_name: string }[]) ?? []).map((a) => [a.id, a.full_name]));

  const expiredLicense = licenses.find((l) => statusFromExpiry(l.expiry_date) === "expired");
  const overdueCarePlan = carePlanData.stalePlans[0] ?? carePlanData.noPlans[0] ?? null;
  const careRows = [...carePlanData.noPlans, ...carePlanData.stalePlans].slice(0, 5);

  return (
    <PageShell role="admin" title="Admin Dashboard" subtitle="Full system overview and control" userName={profile?.full_name}>
      <div className="space-y-4 max-w-6xl">
        {expiredLicense && (
          <div className="w-full bg-warning-bg border border-warning-border rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="size-4 text-warning-text flex-shrink-0" />
            <p className="text-[13px] text-warning-text">
              {expiredLicense.license_name} held by {expiredLicense.profiles?.full_name ?? "Organization"} is expired — action needed.{" "}
              <Link href="/admin/licenses" className="text-gold font-medium">Start renewal →</Link>
            </p>
          </div>
        )}
        {overdueCarePlan && (
          <div className="w-full bg-warning-bg border border-warning-border rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="size-4 text-warning-text flex-shrink-0" />
            <p className="text-[13px] text-warning-text">
              {overdueCarePlan.clientName}&apos;s care plan is overdue —{" "}
              {overdueCarePlan.status === "no_plan" ? "no plan on file" : `last updated ${overdueCarePlan.daysSincePlan} days ago`}.{" "}
              <Link href="/admin/forms?open=client_care_plan" className="text-gold font-medium">Send form →</Link>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/admin/forms" className="bg-paper border border-line2 rounded-xl p-5 block hover:border-gold transition">
            <p className="text-2xl font-semibold text-ink">{formCount ?? 0}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted mt-1">Forms</p>
            <p className="text-[12px] text-ink3 mt-1">{submissionsThisWeek ?? 0} submitted this week</p>
          </Link>
          <Link href="/admin/licenses" className="bg-paper border border-line2 rounded-xl p-5 block hover:border-gold transition">
            <p className="text-2xl font-semibold text-ink">{licenseCount ?? 0}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted mt-1">Licenses</p>
            <p className={`text-[12px] mt-1 ${(licenseAttention ?? 0) > 0 ? "text-warning-text" : "text-ink3"}`}>{licenseAttention ?? 0} need attention</p>
          </Link>
          <Link href="/admin/documents" className="bg-paper border border-line2 rounded-xl p-5 block hover:border-gold transition">
            <p className="text-2xl font-semibold text-ink">{documentCount ?? 0}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted mt-1">Documents</p>
            <p className="text-[12px] text-ink3 mt-1">Across {folderCount ?? 0} folders</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-paper border border-line2 rounded-xl p-5">
            <h2 className="text-[13px] font-medium text-ink mb-2">Recent activity</h2>
            {logs.length === 0 ? (
              <p className="text-[12px] text-muted py-3">No recent activity.</p>
            ) : (
              <div className="divide-y divide-line">
                {logs.map((log) => {
                  const cfg = auditIcon[log.action] ?? { Icon: Activity, bg: "bg-paper2", text: "text-muted" };
                  const Icon = cfg.Icon;
                  const status = (log.metadata?.["status"] as string) ?? null;
                  return (
                    <div key={log.id} className="flex items-center gap-3 py-2">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-ink2 font-medium capitalize">{log.action.replace(/_/g, " ").toLowerCase()}</p>
                        <p className="text-[12px] text-muted truncate">{actorMap.get(log.actor_id ?? "") ?? "System"} · {relativeTime(log.created_at)}</p>
                      </div>
                      {status === "sent" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success-bg text-success-text">sent</span>}
                      {status === "failed" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger-bg text-danger-text">failed</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-paper border border-line2 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-medium text-ink">Licenses expiring</h2>
              <Link href="/admin/licenses" className="text-[12px] text-gold">See all →</Link>
            </div>
            {licenses.length === 0 ? (
              <p className="text-[12px] text-muted py-3">No licenses on file.</p>
            ) : (
              <div className="divide-y divide-line">
                {licenses.map((l) => {
                  const badge = expiryBadge(l.expiry_date);
                  return (
                    <div key={l.id} className="flex items-center gap-3 py-2">
                      <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: badge.dot }} className="flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-ink2 truncate">{l.license_name}</p>
                        <p className="text-[12px] text-muted truncate">{l.profiles?.full_name ?? "Organization"}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-paper border border-line2 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[13px] font-medium text-ink">Care plan status</h2>
            <span className="bg-slateWash text-slate text-[10px] px-2 py-0.5 rounded-full">Auto-tracked</span>
          </div>
          {careRows.length === 0 ? (
            <p className="text-[12px] text-muted py-2">All client care plans are current.</p>
          ) : (
            <div className="divide-y divide-line">
              {careRows.map((c) => {
                const isStale = c.status === "no_plan" || c.status === "stale";
                return (
                  <div key={c.clientId} className="flex items-center gap-3 py-2">
                    <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: isStale ? "#991B1B" : "#065F46" }} className="flex-shrink-0" />
                    <p className="text-[13px] text-ink2 flex-1 min-w-0 truncate">{c.clientName}</p>
                    <span className={`text-[12px] ${isStale ? "text-danger-text" : "text-success-text"}`}>
                      {c.status === "no_plan" ? "No plan" : c.status === "stale" ? "Overdue" : "Current"}
                    </span>
                    <span className="text-[12px] text-muted w-24 text-right">{c.status === "no_plan" ? "Never" : `${c.daysSincePlan}d ago`}</span>
                    {isStale ? (
                      <Link href={`/admin/forms?open=client_care_plan&prefill_name=${encodeURIComponent(c.clientName)}`} className="text-gold text-[12px] w-24 text-right">Send form →</Link>
                    ) : (
                      <span className="text-muted text-[12px] w-24 text-right">Current</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
