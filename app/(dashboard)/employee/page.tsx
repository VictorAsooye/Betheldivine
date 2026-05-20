import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import { Eye } from "lucide-react";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusFromExpiry(expiry: string) {
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return { cls: "bg-danger-bg text-danger-text", label: `${Math.abs(days)}d overdue` };
  if (days <= 30) return { cls: "bg-warning-bg text-warning-text", label: `${days}d left` };
  return { cls: "bg-success-bg text-success-text", label: `${days}d left` };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface FormRow {
  id: string;
  name: string;
  target_role: string;
}

interface LicenseRow {
  id: string;
  license_name: string;
  issuing_authority: string | null;
  expiry_date: string;
}

interface DocRow {
  id: string;
  file_name: string;
  created_at: string;
}

export default async function EmployeeDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).single();

  const [
    { data: pickUp },
    { data: forms },
    { data: mySubmissions },
    { data: myLicenses },
    { data: recentDocs },
  ] = await Promise.all([
    supabase
      .from("form_submissions")
      .select("id, form_id, created_at")
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("forms")
      .select("id, name, target_role")
      .in("target_role", ["employee", "all"])
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase.from("form_submissions").select("form_id").eq("submitted_by", userId),
    supabase
      .from("licenses")
      .select("id, license_name, issuing_authority, expiry_date")
      .eq("holder_id", userId)
      .order("expiry_date", { ascending: true })
      .limit(3),
    supabase.from("documents").select("id, file_name, created_at").order("created_at", { ascending: false }).limit(3),
  ]);

  const submittedFormIds = new Set(((mySubmissions as { form_id: string }[] | null) ?? []).map((s) => s.form_id));
  const formList = (forms as FormRow[] | null) ?? [];
  const licenses = (myLicenses as LicenseRow[] | null) ?? [];
  const docs = (recentDocs as DocRow[] | null) ?? [];

  let pickUpName = "";
  const pu = pickUp as { id: string; form_id: string; created_at: string } | null;
  if (pu) {
    const { data: f } = await supabase.from("forms").select("name").eq("id", pu.form_id).maybeSingle();
    pickUpName = (f as { name?: string } | null)?.name ?? "a form";
  }

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <PageShell role="employee" title={firstName ? `Welcome, ${firstName}` : "Welcome"} subtitle="Your forms, licenses, and documents" userName={profile?.full_name}>
      <div className="space-y-4 max-w-5xl">
        {pu && (
          <div className="bg-navy rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-gold text-[10px] font-mono uppercase tracking-widest">Pick up where you left off</p>
              <p className="text-white text-[13px] font-medium mt-1">{pickUpName}</p>
              <p className="text-white/50 text-[12px] mt-0.5">Started by you · {relativeTime(pu.created_at)}</p>
            </div>
            <Link href="/employee/forms" className="text-gold border border-gold rounded-lg px-4 py-2 text-[13px] font-medium flex-shrink-0">
              Open →
            </Link>
          </div>
        )}

        {/* Forms assigned */}
        <div className="bg-paper border border-line2 rounded-xl p-5">
          <h2 className="text-[13px] font-medium text-ink mb-3">Forms assigned to you</h2>
          {formList.length === 0 ? (
            <p className="text-[12px] text-muted py-2">No forms assigned right now.</p>
          ) : (
            <div className="divide-y divide-line">
              {formList.map((f) => {
                const done = submittedFormIds.has(f.id);
                return (
                  <div key={f.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-ink truncate">{f.name}</p>
                      <p className="text-[12px] text-muted">Sent by admin</p>
                    </div>
                    {done ? (
                      <span className="text-[12px] text-muted">Done</span>
                    ) : (
                      <Link href={`/forms/${f.id}`} className="text-gold border border-gold rounded-lg px-3 py-1.5 text-[12px] font-medium">Open</Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* My licenses */}
          <div className="bg-paper border border-line2 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-medium text-ink">My licenses</h2>
              <Link href="/employee/licenses" className="text-[12px] text-gold">See all →</Link>
            </div>
            {licenses.length === 0 ? (
              <p className="text-[12px] text-muted py-2">No licenses on file.</p>
            ) : (
              <div className="divide-y divide-line">
                {licenses.map((l) => {
                  const badge = statusFromExpiry(l.expiry_date);
                  return (
                    <div key={l.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-ink2 truncate">{l.license_name}</p>
                        <p className="text-[12px] text-muted truncate">{l.issuing_authority ?? "—"}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent documents */}
          <div className="bg-paper border border-line2 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-medium text-ink">Recent documents</h2>
              <Link href="/employee/documents" className="text-[12px] text-gold">See all →</Link>
            </div>
            {docs.length === 0 ? (
              <p className="text-[12px] text-muted py-2">No documents yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-ink2 truncate">{d.file_name}</p>
                      <p className="text-[12px] text-muted">{formatDate(d.created_at)}</p>
                    </div>
                    <Link href={`/view?d=${d.id}`} className="text-muted hover:text-ink p-1" title="View">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
