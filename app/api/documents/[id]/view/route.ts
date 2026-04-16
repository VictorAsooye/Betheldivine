// Public document view endpoint — no auth required.
// Returns a 24-hour signed URL for the document so the /view/[id] page can embed it.
// The document UUID acts as the access token (unguessable).
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const BUCKET = "documents";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: doc, error } = await service
    .from("documents")
    .select("file_path, file_name, mime_type, file_size")
    .eq("id", params.id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await service.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 60 * 60 * 24); // 24 hours

  if (signError || !signed) {
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }

  return NextResponse.json({
    file_name: doc.file_name,
    mime_type: doc.mime_type,
    file_size: doc.file_size,
    url: signed.signedUrl,
  });
}
