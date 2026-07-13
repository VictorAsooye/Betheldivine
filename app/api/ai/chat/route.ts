import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveContext, RetrievedChunk } from "@/lib/retrieval";
import { createForm, updateForm } from "@/lib/forms";
import type { FormField } from "@/components/FormRenderer";

export const maxDuration = 30;

interface Citation {
  source_type: string;
  source_id: string;
  label: string;
}

interface FormAction {
  type: "created" | "updated";
  formId: string;
  formName: string;
}

const FORM_FIELD_SCHEMA = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "Unique snake_case identifier for this field, e.g. full_name" },
    type: {
      type: "string",
      enum: ["text", "textarea", "select", "multiselect", "boolean", "date", "datetime", "number", "email", "phone", "section"],
    },
    label: { type: "string" },
    required: { type: "boolean" },
    options: { type: "array", items: { type: "string" }, description: "Choices — only for select/multiselect fields" },
    placeholder: { type: "string" },
  },
  required: ["id", "type", "label", "required"],
};

const FORM_TOOLS = [
  {
    name: "list_forms",
    description: "List every form on file with its id, name, target role, active status, and submission count. Call this before update_form if you don't already know the form's id.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "create_form",
    description: "Create a new fillable form that staff or clients can fill out in the app. Use this when the user asks to build or create a new form.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        target_role: { type: "string", enum: ["employee", "client", "all"] },
        fields: { type: "array", items: FORM_FIELD_SCHEMA },
      },
      required: ["name", "target_role", "fields"],
    },
  },
  {
    name: "update_form",
    description: "Update an existing form's name, description, target role, active status, and/or fields. Updating fields REPLACES the entire fields array — include every field that should remain, not just the new ones.",
    input_schema: {
      type: "object" as const,
      properties: {
        form_id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        target_role: { type: "string", enum: ["employee", "client", "all"] },
        is_active: { type: "boolean" },
        fields: { type: "array", items: FORM_FIELD_SCHEMA },
      },
      required: ["form_id"],
    },
  },
];

async function resolveLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chunks: RetrievedChunk[]
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();

  const documentIds = chunks.filter((c) => c.source_type === "document").map((c) => c.source_id);
  const formIds = chunks.filter((c) => c.source_type === "form").map((c) => c.source_id);
  const licenseIds = chunks.filter((c) => c.source_type === "license").map((c) => c.source_id);
  const submissionIds = chunks.filter((c) => c.source_type === "submission").map((c) => c.source_id);

  if (documentIds.length) {
    const { data } = await supabase.from("documents").select("id, file_name").in("id", documentIds);
    for (const row of data ?? []) labels.set(`document:${row.id}`, row.file_name);
  }
  if (formIds.length) {
    const { data } = await supabase.from("forms").select("id, name").in("id", formIds);
    for (const row of data ?? []) labels.set(`form:${row.id}`, row.name);
  }
  if (licenseIds.length) {
    const { data } = await supabase.from("licenses").select("id, license_name").in("id", licenseIds);
    for (const row of data ?? []) labels.set(`license:${row.id}`, row.license_name);
  }
  if (submissionIds.length) {
    const { data } = await supabase
      .from("form_submissions")
      .select("id, created_at, forms(name), profiles!form_submissions_submitted_by_fkey(full_name)")
      .in("id", submissionIds);
    for (const row of data ?? []) {
      const formName = (row.forms as unknown as { name: string } | null)?.name ?? "Form";
      const submitter = (row.profiles as unknown as { full_name: string } | null)?.full_name;
      const date = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      labels.set(`submission:${row.id}`, `${formName} — ${submitter ?? "anonymous"}, ${date}`);
    }
  }

  return labels;
}

async function executeFormTool(
  name: string,
  input: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ output: unknown; formAction?: FormAction }> {
  if (name === "list_forms") {
    const { data: forms } = await supabase
      .from("forms")
      .select("id, name, target_role, is_active")
      .order("created_at", { ascending: false });
    return { output: forms ?? [] };
  }

  if (name === "create_form") {
    const fields = input.fields as FormField[];
    const form = await createForm(supabase, userId, {
      name: input.name as string,
      description: (input.description as string) ?? null,
      schema: { title: input.name as string, description: input.description as string | undefined, fields },
      target_role: input.target_role as string,
    });
    return {
      output: { id: form.id, name: form.name },
      formAction: { type: "created", formId: form.id, formName: form.name },
    };
  }

  if (name === "update_form") {
    const formId = input.form_id as string;
    const { data: existing, error } = await supabase.from("forms").select("*").eq("id", formId).single();
    if (error || !existing) return { output: { error: "Form not found" } };

    const fields = input.fields as FormField[] | undefined;
    const newSchema = fields
      ? {
          title: (input.name as string) ?? existing.schema.title,
          description: (input.description as string) ?? existing.schema.description,
          fields,
        }
      : undefined;

    const form = await updateForm(supabase, {
      id: formId,
      name: input.name as string | undefined,
      description: input.description as string | undefined,
      target_role: input.target_role as string | undefined,
      is_active: input.is_active as boolean | undefined,
      schema: newSchema,
    });
    return {
      output: { id: form.id, name: form.name },
      formAction: { type: "updated", formId: form.id, formName: form.name },
    };
  }

  return { output: { error: "Unknown tool" } };
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

  if (!profile || !["admin", "owner", "employee"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canManageForms = ["admin", "owner"].includes(profile.role);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-your_anthropic_api_key") {
    return NextResponse.json({ error: "AI features are not configured." }, { status: 503 });
  }

  let question: string;
  try {
    const body = await request.json();
    question = body.question;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  try {
    const chunks = await retrieveContext(supabase, question);

    if (chunks.length === 0 && !canManageForms) {
      return NextResponse.json({
        answer:
          "I don't have any relevant data to answer that yet — either nothing matching has been added, or embeddings haven't been generated. Try asking about a form, license, or document you know exists.",
        citations: [],
      });
    }

    const labels = await resolveLabels(supabase, chunks);

    const contextBlock = chunks.length
      ? chunks
          .map((chunk, i) => {
            const label = labels.get(`${chunk.source_type}:${chunk.source_id}`) ?? chunk.source_id;
            return `[${i + 1}] (${chunk.source_type}: ${label})\n${chunk.content}`;
          })
          .join("\n\n")
      : "(no matching context found for this question)";

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = canManageForms
      ? "You are Sola, an assistant for Bethel Divine Healthcare Services. Answer questions using ONLY the provided context — if the answer isn't in it, say so clearly rather than guessing, and cite sources like [1]. You can also build and edit forms: use create_form when asked to build a new form, and update_form to change an existing one (call list_forms first if you need its id). After a tool action succeeds, briefly confirm what you did in plain language — no need to restate the raw field list."
      : "You are Sola, an assistant for Bethel Divine Healthcare Services. Answer the user's question using ONLY the provided context below. If the answer isn't in the context, say so clearly — do not guess. Cite which numbered source each part of your answer came from, e.g. [1].";

    const anthropicMessages: Anthropic.MessageParam[] = [
      { role: "user", content: `Context:\n\n${contextBlock}\n\nQuestion: ${question}` },
    ];

    let answer = "";
    let formAction: FormAction | undefined;

    for (let turn = 0; turn < 4; turn++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1536,
        thinking: { type: "disabled" },
        system: systemPrompt,
        messages: anthropicMessages,
        ...(canManageForms ? { tools: FORM_TOOLS } : {}),
      });

      if (response.stop_reason !== "tool_use") {
        const textBlock = response.content.find((c) => c.type === "text");
        answer = textBlock && textBlock.type === "text" ? textBlock.text : "";
        break;
      }

      anthropicMessages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const result = await executeFormTool(block.name, block.input as Record<string, unknown>, supabase, user.id);
        if (result.formAction) formAction = result.formAction;
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result.output),
        });
      }
      anthropicMessages.push({ role: "user", content: toolResults });
    }

    const seen = new Set<string>();
    const citations: Citation[] = [];
    for (const chunk of chunks) {
      const key = `${chunk.source_type}:${chunk.source_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      citations.push({
        source_type: chunk.source_type,
        source_id: chunk.source_id,
        label: labels.get(key) ?? chunk.source_id,
      });
    }

    return NextResponse.json({ answer, citations, formAction });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai/chat] failed:", message);
    return NextResponse.json({ error: `Failed to answer: ${message}` }, { status: 500 });
  }
}
