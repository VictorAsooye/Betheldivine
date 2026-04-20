import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await service
    .from("static_form_submissions")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch the submitter's profile separately (FK is to auth.users, not profiles)
  let profile: { full_name?: string; email?: string } | null = null;
  if (data.submitted_by) {
    const { data: p } = await service
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.submitted_by)
      .single();
    profile = p ?? null;
  }

  return NextResponse.json({ ...data, profiles: profile });
}
