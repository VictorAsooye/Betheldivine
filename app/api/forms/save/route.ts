import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { embedAndStore } from "@/lib/embeddings";

function formEmbedContent(name: string, description: string | null, schema: unknown): string {
  return [name, description ?? "", JSON.stringify(schema)].join("\n");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, schema, target_role } = body;

  if (!name || !schema) {
    return NextResponse.json({ error: "name and schema are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("forms")
    .insert({
      name,
      description: description ?? null,
      schema,
      target_role: target_role ?? "all",
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await embedAndStore("form", data.id, formEmbedContent(data.name, data.description, data.schema));
  } catch (embedErr) {
    console.error("[forms/save] embedding failed for", data.id, embedErr);
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, is_active, schema, name, description, target_role } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (is_active !== undefined) updates.is_active = is_active;
  if (schema !== undefined) updates.schema = schema;
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (target_role !== undefined) updates.target_role = target_role;

  const { data, error } = await supabase
    .from("forms")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (schema !== undefined || name !== undefined || description !== undefined) {
    try {
      await embedAndStore("form", data.id, formEmbedContent(data.name, data.description, data.schema));
    } catch (embedErr) {
      console.error("[forms/save PATCH] embedding failed for", data.id, embedErr);
    }
  }

  return NextResponse.json(data);
}
