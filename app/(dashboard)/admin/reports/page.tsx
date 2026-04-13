import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportsDashboard from "./ReportsDashboard";

export const metadata = { title: "AI Reports — Bethel Divine" };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) redirect("/dashboard");

  // Load existing reports
  const { data: reports } = await supabase
    .from("reports")
    .select("id, type, content, created_at, generated_by")
    .order("created_at", { ascending: false })
    .limit(20);

  return <ReportsDashboard initialReports={reports ?? []} />;
}
