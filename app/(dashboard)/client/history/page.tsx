import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function CareHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get client record
  const { data: clientRecord } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const clientId = clientRecord?.id ?? null;

  // Fetch completed visits with caregiver name
  const { data: visits } = clientId
    ? await supabase
        .from("shifts")
        .select("id, actual_start, actual_end, employees(profiles(full_name))")
        .eq("client_id", clientId)
        .eq("status", "completed")
        .order("actual_start", { ascending: false })
        .limit(50)
    : { data: [] };

  // Fetch medication logs
  const { data: medLogs } = clientId
    ? await supabase
        .from("medication_logs")
        .select("id, medication_name, dosage, administered_at, notes, employees(profiles(full_name))")
        .eq("client_id", clientId)
        .order("administered_at", { ascending: false })
        .limit(50)
    : { data: [] };

  function formatDateTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  }

  function formatDuration(start: string | null, end: string | null) {
    if (!start || !end) return "—";
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function caregiverName(row: any) {
    return row?.employees?.profiles?.full_name ?? "—";
  }

  return (
    <div>
      <PageHeader title="Care History" subtitle="Your past visits and medication records" />

      <div className="p-8 space-y-8">

        {/* Visits */}
        <div>
          <h2
            className="text-base font-semibold mb-4"
            style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
          >
            Past Visits
          </h2>

          {!clientId ? (
            <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: "#dce2ec" }}>
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
                No client profile linked to your account. Please contact your administrator.
              </p>
            </div>
          ) : !visits || visits.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: "#dce2ec" }}>
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No completed visits on record yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #dce2ec", backgroundColor: "#f7f9fc" }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Caregiver</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Duration</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide hidden sm:table-cell" style={{ color: "#8e9ab0" }}>Clock Out</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v: any, i: number) => (
                    <tr
                      key={v.id}
                      style={{ borderBottom: i < visits.length - 1 ? "1px solid #dce2ec" : undefined }}
                    >
                      <td className="px-5 py-4 text-sm font-sans" style={{ color: "#1a2e4a" }}>
                        {formatDateTime(v.actual_start)}
                      </td>
                      <td className="px-5 py-4 text-sm font-sans" style={{ color: "#1a2e4a" }}>
                        {caregiverName(v)}
                      </td>
                      <td className="px-5 py-4 text-sm font-sans font-semibold" style={{ color: "#2d8a5e" }}>
                        {formatDuration(v.actual_start, v.actual_end)}
                      </td>
                      <td className="px-5 py-4 text-sm font-sans hidden sm:table-cell" style={{ color: "#8e9ab0" }}>
                        {formatDateTime(v.actual_end)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Medication Logs */}
        <div>
          <h2
            className="text-base font-semibold mb-4"
            style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
          >
            Medication Records
          </h2>

          {!clientId ? null : !medLogs || medLogs.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: "#dce2ec" }}>
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No medication records on file yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #dce2ec", backgroundColor: "#f7f9fc" }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Medication</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Dosage</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Administered</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide hidden md:table-cell" style={{ color: "#8e9ab0" }}>By</th>
                  </tr>
                </thead>
                <tbody>
                  {medLogs.map((m: any, i: number) => (
                    <tr
                      key={m.id}
                      style={{ borderBottom: i < medLogs.length - 1 ? "1px solid #dce2ec" : undefined }}
                    >
                      <td className="px-5 py-4 text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>{m.medication_name}</td>
                      <td className="px-5 py-4 text-sm font-sans" style={{ color: "#1a2e4a" }}>{m.dosage ?? "—"}</td>
                      <td className="px-5 py-4 text-sm font-sans" style={{ color: "#8e9ab0" }}>{formatDateTime(m.administered_at)}</td>
                      <td className="px-5 py-4 text-sm font-sans hidden md:table-cell" style={{ color: "#8e9ab0" }}>{caregiverName(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
