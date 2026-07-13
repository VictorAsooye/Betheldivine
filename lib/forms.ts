import type { SupabaseClient } from "@supabase/supabase-js";
import { embedAndStore } from "@/lib/embeddings";
import type { FormSchema } from "@/components/FormRenderer";

function formEmbedContent(name: string, description: string | null, schema: unknown): string {
  return [name, description ?? "", JSON.stringify(schema)].join("\n");
}

export interface CreateFormInput {
  name: string;
  description?: string | null;
  schema: FormSchema;
  target_role?: string;
}

export async function createForm(supabase: SupabaseClient, userId: string, input: CreateFormInput) {
  const { data, error } = await supabase
    .from("forms")
    .insert({
      name: input.name,
      description: input.description ?? null,
      schema: input.schema,
      target_role: input.target_role ?? "all",
      created_by: userId,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  try {
    await embedAndStore("form", data.id, formEmbedContent(data.name, data.description, data.schema));
  } catch (embedErr) {
    console.error("[forms] embedding failed for", data.id, embedErr);
  }

  return data;
}

export interface UpdateFormInput {
  id: string;
  name?: string;
  description?: string | null;
  schema?: FormSchema;
  target_role?: string;
  is_active?: boolean;
}

export async function updateForm(supabase: SupabaseClient, input: UpdateFormInput) {
  const updates: Record<string, unknown> = {};
  if (input.is_active !== undefined) updates.is_active = input.is_active;
  if (input.schema !== undefined) updates.schema = input.schema;
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.target_role !== undefined) updates.target_role = input.target_role;

  const { data, error } = await supabase
    .from("forms")
    .update(updates)
    .eq("id", input.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (input.schema !== undefined || input.name !== undefined || input.description !== undefined) {
    try {
      await embedAndStore("form", data.id, formEmbedContent(data.name, data.description, data.schema));
    } catch (embedErr) {
      console.error("[forms] embedding failed for", data.id, embedErr);
    }
  }

  return data;
}
