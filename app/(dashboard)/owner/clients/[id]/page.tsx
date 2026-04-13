import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  given:     { bg: "#f0faf5", color: "#2d8a5e" },
  refused:   { bg: "#fef2f2", color: "#c0392b" },
  missed:    { bg: "#fdf8ec", color: "#c8991a" },
  scheduled: { bg: "#f0f4ff", color: "#1a2e4a" },
  active:    { bg: "#f0faf5", color: "#2d8a5e" },
  completed: { bg: "#f7f9fc", color: "#8e9ab0" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export default async function OwnerClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id, date_of_birth, address, emergency_contact, insurance_info, assigned_employees, profile_id, profiles(full_name, email)")
    .eq("id", params.id)
    .single();

  if (!client) redirect("/owner/clients");

  const { data: medLogs } = await supabase
    .from("medication_logs")
    .select("id, medication_name, dosage, administered_at, status, notes, employees(profiles(full_name))")
    .eq("client_id", params.id)
    .order("administered_at", { ascending: false })
    .limit(20);

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, scheduled_start, scheduled_end, status, evv_verified, employees(profiles(full_name))")
    .eq("client_id", params.id)
    .order("scheduled_start", { ascending: false })
    .limit(10);

  const employeeIds = client.assigned_employees ?? [];
  let employees: { id: string; position?: string; profiles?: { full_name?: string } }[] = [];
  if (employeeIds.length) {
    const { data: empData } = await supabase
      .from("employees")
      .select("id, position, profiles(full_name)")
      .in("id", employeeIds);
    employees = (empData ?? []) as { id: string; position?: string; profiles?: { full_name?: string } }[];
  }

  const clientName = (client.profiles as { full_name?: string } | null)?.full_name ?? "Client";
  const ec = client.emergency_contact as { name?: string; phone?: string; relation?: string } | null;
  const ins = client.insurance_info as { provider?: string; id?: string } | null;

  return (
    <div>
      <PageHeader
        title={clientName}
        subtitle="Client profile and care history"
        action={
          <Link href="/owner/clients" className="text-sm font-sans font-semibold px-4 py-2 rounded-lg border"
            style={{ borderColor: "#dce2ec", color: "#8e9ab0" }}>
            ← Back
          </Link>
        }
      />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col — profile details */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>Profile</h2>
            <div className="space-y-3 text-sm font-sans">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8e9ab0" }}>Date of Birth</p>
                <p style={{ color: "#1a2e4a" }}>{client.date_of_birth ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8e9ab0" }}>Address</p>
                <p style={{ color: "#1a2e4a" }}>{client.address ?? "—"}</p>
              </div>
              {ec?.name && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8e9ab0" }}>Emergency Contact</p>
                  <p style={{ color: "#1a2e4a" }}>{ec.name}{ec.relation ? ` (${ec.relation})` : ""}</p>
                  {ec.phone && <p style={{ color: "#8e9ab0" }}>{ec.phone}</p>}
                </div>
              )}
              {ins?.provider && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#8e9ab0" }}>Insurance</p>
                  <p style={{ color: "#1a2e4a" }}>{ins.provider}</p>
                  {ins.id && <p style={{ color: "#8e9ab0" }}>ID: {ins.id}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>Assigned Staff</h2>
            {employees.length === 0 ? (
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No employees assigned.</p>
            ) : (
              <div className="space-y-2">
                {employees.map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: "#1a2e4a" }}>
                      {e.profiles?.full_name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-sans" style={{ color: "#1a2e4a" }}>{e.profiles?.full_name ?? "—"}</p>
                      {e.position && <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{e.position}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col — shifts + medication */}
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>Shifts</h2>
            {!shifts?.length ? (
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No shifts yet.</p>
            ) : (
              <div className="space-y-2">
                {shifts.map((s) => {
                  const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.scheduled;
                  const empName = (s.employees as { profiles?: { full_name?: string } } | null)?.profiles?.full_name ?? "—";
                  return (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#dce2ec" }}>
                      <div>
                        <p className="text-sm font-sans font-medium" style={{ color: "#1a2e4a" }}>{fmt(s.scheduled_start)}</p>
                        <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>Employee: {empName}{s.evv_verified ? " · EVV ✓" : ""}</p>
                      </div>
                      <span className="text-xs font-semibold font-sans px-2 py-1 rounded-full capitalize"
                        style={{ backgroundColor: badge.bg, color: badge.color }}>{s.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>Medication Logs</h2>
            {!medLogs?.length ? (
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No medication logs yet.</p>
            ) : (
              <div className="space-y-2">
                {medLogs.map((log) => {
                  const badge = STATUS_BADGE[log.status] ?? STATUS_BADGE.given;
                  const empName = (log.employees as { profiles?: { full_name?: string } } | null)?.profiles?.full_name ?? "—";
                  return (
                    <div key={log.id} className="flex items-start justify-between py-2 border-b last:border-0" style={{ borderColor: "#dce2ec" }}>
                      <div>
                        <p className="text-sm font-sans font-semibold" style={{ color: "#1a2e4a" }}>
                          {log.medication_name}{log.dosage ? ` · ${log.dosage}` : ""}
                        </p>
                        <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{fmt(log.administered_at)} · {empName}</p>
                        {log.notes && <p className="text-xs italic font-sans" style={{ color: "#8e9ab0" }}>{log.notes}</p>}
                      </div>
                      <span className="text-xs font-semibold font-sans px-2 py-1 rounded-full capitalize ml-2 flex-shrink-0"
                        style={{ backgroundColor: badge.bg, color: badge.color }}>{log.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
