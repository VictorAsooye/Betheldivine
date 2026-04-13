import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

interface MedLog {
  id: string;
  medication_name: string;
  dosage?: string;
  administered_at: string;
  status: string;
  notes?: string;
  employees?: { profiles?: { full_name?: string } } | null;
}

interface Shift {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  employees?: { profiles?: { full_name?: string } } | null;
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  given:    { bg: "#f0faf5", color: "#2d8a5e" },
  refused:  { bg: "#fef2f2", color: "#c0392b" },
  missed:   { bg: "#fdf8ec", color: "#c8991a" },
  scheduled: { bg: "#f0f4ff", color: "#1a2e4a" },
  active:    { bg: "#f0faf5", color: "#2d8a5e" },
  completed: { bg: "#f7f9fc", color: "#8e9ab0" },
  missed_shift: { bg: "#fef2f2", color: "#c0392b" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export default async function EmployeeClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/clients/${params.id}`, {
    headers: { Cookie: "" },
    cache: "no-store",
  });

  // Use supabase directly for server component
  const { data: client } = await supabase
    .from("clients")
    .select("id, date_of_birth, address, emergency_contact, profile_id, profiles(full_name, email)")
    .eq("id", params.id)
    .single();

  if (!client) redirect("/employee/clients");

  const { data: medLogs } = await supabase
    .from("medication_logs")
    .select("id, medication_name, dosage, administered_at, status, notes, employees(profiles(full_name))")
    .eq("client_id", params.id)
    .order("administered_at", { ascending: false })
    .limit(20);

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, scheduled_start, scheduled_end, status, employees(profiles(full_name))")
    .eq("client_id", params.id)
    .order("scheduled_start", { ascending: false })
    .limit(10);

  const ec = client.emergency_contact as { name?: string; phone?: string; relation?: string } | null;
  const clientName = (client.profiles as { full_name?: string } | null)?.full_name ?? "Client";

  return (
    <div>
      <PageHeader
        title={clientName}
        subtitle="Client profile and care history"
        action={
          <Link
            href="/employee/clients"
            className="text-sm font-sans font-semibold px-4 py-2 rounded-lg border"
            style={{ borderColor: "#dce2ec", color: "#8e9ab0" }}
          >
            ← Back
          </Link>
        }
      />

      <div className="p-8 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
            Client Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-sans">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8e9ab0" }}>Date of Birth</p>
              <p style={{ color: "#1a2e4a" }}>{client.date_of_birth ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8e9ab0" }}>Address</p>
              <p style={{ color: "#1a2e4a" }}>{client.address ?? "—"}</p>
            </div>
            {ec?.name && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8e9ab0" }}>Emergency Contact</p>
                <p style={{ color: "#1a2e4a" }}>{ec.name}{ec.relation ? ` (${ec.relation})` : ""}</p>
                {ec.phone && <p style={{ color: "#8e9ab0" }}>{ec.phone}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Recent Shifts */}
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
            Recent Shifts
          </h2>
          {!shifts?.length ? (
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No shifts yet.</p>
          ) : (
            <div className="space-y-2">
              {shifts.map((s) => {
                const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.scheduled;
                const emp = (s.employees as { profiles?: { full_name?: string } } | null)?.profiles?.full_name;
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#dce2ec" }}>
                    <div>
                      <p className="text-sm font-sans font-medium" style={{ color: "#1a2e4a" }}>{fmt(s.scheduled_start)}</p>
                      {emp && <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>Employee: {emp}</p>}
                    </div>
                    <span className="text-xs font-semibold font-sans px-2 py-1 rounded-full capitalize"
                      style={{ backgroundColor: badge.bg, color: badge.color }}>
                      {s.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Medication Logs */}
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Medication Log
            </h2>
            <Link
              href={`/employee/logs?client=${params.id}`}
              className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: "#1a2e4a", color: "white" }}
            >
              + Add Log
            </Link>
          </div>
          {!medLogs?.length ? (
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No medication logs yet.</p>
          ) : (
            <div className="space-y-2">
              {(medLogs as MedLog[]).map((log) => {
                const badge = STATUS_BADGE[log.status] ?? STATUS_BADGE.given;
                return (
                  <div key={log.id} className="flex items-start justify-between py-2 border-b last:border-0" style={{ borderColor: "#dce2ec" }}>
                    <div>
                      <p className="text-sm font-sans font-semibold" style={{ color: "#1a2e4a" }}>
                        {log.medication_name} {log.dosage ? `· ${log.dosage}` : ""}
                      </p>
                      <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{fmt(log.administered_at)}</p>
                      {log.notes && <p className="text-xs font-sans mt-0.5 italic" style={{ color: "#8e9ab0" }}>{log.notes}</p>}
                    </div>
                    <span className="text-xs font-semibold font-sans px-2 py-1 rounded-full capitalize ml-2 flex-shrink-0"
                      style={{ backgroundColor: badge.bg, color: badge.color }}>
                      {log.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
