import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const BUCKET = "documents";

// GET — signed URL. ?share=1 gives a 24-hour shareable link; default is 5-minute download link.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isShare = new URL(request.url).searchParams.get("share") === "1";

  const { data: doc, error } = await supabase
    .from("documents")
    .select("file_path, file_name, mime_type")
    .eq("id", params.id)
    .single();

  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const expiresIn = isShare ? 60 * 60 * 24 : 300; // 24 hours vs 5 minutes

  const { data: signed, error: signError } = await service.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, expiresIn, {
      download: !isShare, // share links open in browser; download links force-download
    });

  if (signError || !signed) {
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    file_name: doc.file_name,
    mime_type: doc.mime_type,
    expires_in: expiresIn,
  });
}

// PATCH — rename document (file_name, category, description)
// Uses service role to bypass RLS — auth check is done manually above
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins and owners can rename
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, string> = {};
  if (body.file_name) updates.file_name = body.file_name;
  if (body.category) updates.category = body.category;
  if ("description" in body) updates.description = body.description;

  // Use service role to bypass RLS (no UPDATE policy on documents table)
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await service
    .from("documents")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — remove document + storage file
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: doc, error } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", params.id)
    .single();

  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await service.storage.from(BUCKET).remove([doc.file_path]);

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", params.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
