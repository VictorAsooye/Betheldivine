import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import ViewAsBanner from "@/components/ViewAsBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "pending") {
    redirect("/pending");
  }

  return (
    <DashboardShell role={profile.role} fullName={profile.full_name}>
      <ViewAsBanner adminRole={profile.role} />
      {children}
    </DashboardShell>
  );
}
