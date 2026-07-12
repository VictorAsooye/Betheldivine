import { createClient } from "@/lib/supabase/server";
import CarePlansLibrary from "@/components/CarePlansLibrary";

export const metadata = { title: "Care Plans Library" };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return <CarePlansLibrary role="admin" userName={profile?.full_name} />;
}
