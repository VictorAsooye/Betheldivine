import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { embedAndStore } from "@/lib/embeddings";
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

// One-time (or re-runnable) backfill: embeds every existing document, form,
// and license. Admin-only. Safe to re-run — embedAndStore replaces existing
// chunks for each source.
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

  const results = { documents: 0, forms: 0, licenses: 0, errors: [] as string[] };

  const { data: forms } = await service
    .from("forms")
    .select("id, name, description, schema");
  for (const form of forms ?? []) {
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

  return NextResponse.json(results);
}
