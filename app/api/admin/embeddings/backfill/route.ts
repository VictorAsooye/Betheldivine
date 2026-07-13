import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { embedAndStore, submissionEmbedContent, staticFormEmbedContent } from "@/lib/embeddings";
import type { FormField } from "@/components/FormRenderer";
import { extractText } from "@/lib/extract-text";

export const maxDuration = 60; // seconds — Vercel Hobby max

const BUCKET = "documents";

interface LicenseRow {
  id: string;
  holder_id: string;
  license_name: string;
  issuing_authority: string;
  license_number: string;
  expiry_date: string;
  notes: string | null;
}

// Backfill embeddings for every document, form, license, and submission
// (dynamic + static). Admin-only. Skips anything already embedded, so it's
// safe and cheap to call repeatedly — useful since Voyage's embedding API
// rate-limits by default, meaning one call may not get through everything.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = { documents: 0, forms: 0, licenses: 0, submissions: 0, staticSubmissions: 0, skipped: 0, errors: [] as string[] };

  // Embedding calls are rate-limited (Voyage AI), so make this resumable:
  // skip anything that already has at least one embedding row, so repeated
  // calls make incremental progress instead of re-doing finished work.
  const { data: existingRows } = await service.from("document_embeddings").select("source_type, source_id");
  const alreadyEmbedded = new Set((existingRows ?? []).map((r) => `${r.source_type}:${r.source_id}`));

  const { data: forms } = await service
    .from("forms")
    .select("id, name, description, schema");
  for (const form of forms ?? []) {
    if (alreadyEmbedded.has(`form:${form.id}`)) { results.skipped++; continue; }
    try {
      await embedAndStore(
        "form",
        form.id,
        [form.name, form.description ?? "", JSON.stringify(form.schema)].join("\n")
      );
      results.forms++;
    } catch (err) {
      results.errors.push(`form ${form.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  const { data: licenses } = await service
    .from("licenses")
    .select("id, holder_id, license_name, issuing_authority, license_number, expiry_date, notes");
  for (const license of (licenses ?? []) as LicenseRow[]) {
    if (alreadyEmbedded.has(`license:${license.id}`)) { results.skipped++; continue; }
    try {
      await embedAndStore(
        "license",
        license.id,
        `${license.license_name} issued by ${license.issuing_authority}, number ${license.license_number}, expires ${license.expiry_date}. ${license.notes ?? ""}`,
        license.holder_id
      );
      results.licenses++;
    } catch (err) {
      results.errors.push(`license ${license.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  const { data: documents } = await service
    .from("documents")
    .select("id, uploader_id, file_path, file_name, mime_type, category, description");
  for (const doc of documents ?? []) {
    if (alreadyEmbedded.has(`document:${doc.id}`)) { results.skipped++; continue; }
    try {
      let content = "";
      if (doc.mime_type === "application/pdf" || (doc.mime_type as string).startsWith("image/")) {
        const { data: fileData } = await service.storage.from(BUCKET).download(doc.file_path);
        if (fileData) {
          const bytes = await fileData.arrayBuffer();
          content = (await extractText(bytes, doc.mime_type)) ?? "";
        }
      }
      if (!content) {
        content = [doc.description, doc.file_name, doc.category].filter(Boolean).join("\n");
      }
      await embedAndStore("document", doc.id, content, doc.uploader_id);
      results.documents++;
    } catch (err) {
      results.errors.push(`document ${doc.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  // Dynamic form submissions (forms/[id]/submissions, forms/[id]/public)
  const { data: submissions } = await service
    .from("form_submissions")
    .select("id, data, forms(name, schema), profiles!form_submissions_submitted_by_fkey(full_name)");
  for (const sub of submissions ?? []) {
    if (alreadyEmbedded.has(`submission:${sub.id}`)) { results.skipped++; continue; }
    try {
      const form = sub.forms as unknown as { name: string; schema: { fields?: FormField[] } } | null;
      const submitter = (sub.profiles as unknown as { full_name?: string } | null)?.full_name;
      await embedAndStore(
        "submission",
        sub.id,
        submissionEmbedContent(form?.name ?? "Form", form?.schema?.fields ?? [], sub.data as Record<string, unknown>, submitter),
        null
      );
      results.submissions++;
    } catch (err) {
      results.errors.push(`submission ${sub.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  // Static form submissions (e.g. the Client Care Plan) — submitted_by is a
  // FK to auth.users, not profiles, so resolve names in a separate query.
  const { data: staticSubs } = await service
    .from("static_form_submissions")
    .select("id, form_type, data, submitted_by");
  const staticSubmitterIds = Array.from(new Set((staticSubs ?? []).map((s) => s.submitted_by).filter(Boolean)));
  const { data: staticProfiles } = staticSubmitterIds.length
    ? await service.from("profiles").select("id, full_name").in("id", staticSubmitterIds)
    : { data: [] };
  const staticSubmitterMap = new Map((staticProfiles ?? []).map((p) => [p.id, p.full_name]));

  for (const sub of staticSubs ?? []) {
    if (alreadyEmbedded.has(`submission:${sub.id}`)) { results.skipped++; continue; }
    try {
      const submitter = sub.submitted_by ? staticSubmitterMap.get(sub.submitted_by) : null;
      await embedAndStore(
        "submission",
        sub.id,
        staticFormEmbedContent(sub.form_type, sub.data as Record<string, unknown>, submitter),
        null
      );
      results.staticSubmissions++;
    } catch (err) {
      results.errors.push(`static submission ${sub.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json(results);
}
