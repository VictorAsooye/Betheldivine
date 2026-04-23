import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PERMITTED_ROLES = ["owner", "admin", "employee"];

export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Role check ────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !PERMITTED_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = getServiceClient();

  // ── Fetch care_plan_documents ─────────────────────────────────────────
  const { data: docs, error: docsErr } = await service
    .from("care_plan_documents")
    .select("id, filename, file_size_bytes, submitted_by, submitted_at, care_plan_submission_id")
    .order("submitted_at", { ascending: false });

  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 });
  }
  if (!docs || docs.length === 0) {
    return NextResponse.json([]);
  }

  // ── Enrich with client name from the originating submission ───────────
  // The form stores client_full_name as JSONB in static_form_submissions.data
  const submissionIds = Array.from(new Set(docs.map((d) => d.care_plan_submission_id).filter(Boolean)));
  const { data: submissions } = submissionIds.length
    ? await service
        .from("static_form_submissions")
        .select("id, data")
        .in("id", submissionIds)
    : { data: [] };

  const submissionMap = new Map(
    (submissions ?? []).map((s) => [
      s.id,
      (s.data as Record<string, unknown>)["client_full_name"] as string | undefined,
    ])
  );

  // ── Enrich with submitter display name ────────────────────────────────
  const submitterIds = Array.from(new Set(docs.map((d) => d.submitted_by).filter(Boolean)));
  const { data: profiles } = submitterIds.length
    ? await service
        .from("profiles")
        .select("id, full_name, email")
        .in("id", submitterIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // ── Assemble response ─────────────────────────────────────────────────
  const enriched = docs.map((doc) => {
    const submitter = profileMap.get(doc.submitted_by);
    const clientName =
      submissionMap.get(doc.care_plan_submission_id) ?? null;

    return {
      id: doc.id,
      filename: doc.filename,
      file_size_bytes: doc.file_size_bytes,
      submitted_at: doc.submitted_at,
      client_name: clientName,
      submitted_by_name: submitter?.full_name ?? submitter?.email ?? "Unknown",
    };
  });

  return NextResponse.json(enriched);
}
