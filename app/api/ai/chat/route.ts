import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveContext, RetrievedChunk } from "@/lib/retrieval";

export const maxDuration = 30;

interface Citation {
  source_type: string;
  source_id: string;
  label: string;
}

async function resolveLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chunks: RetrievedChunk[]
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();

  const documentIds = chunks.filter((c) => c.source_type === "document").map((c) => c.source_id);
  const formIds = chunks.filter((c) => c.source_type === "form").map((c) => c.source_id);
  const licenseIds = chunks.filter((c) => c.source_type === "license").map((c) => c.source_id);

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

  return labels;
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

    if (chunks.length === 0) {
      return NextResponse.json({
        answer:
          "I don't have any relevant data to answer that yet — either nothing matching has been added, or embeddings haven't been generated. Try asking about a form, license, or document you know exists.",
        citations: [],
      });
    }

    const labels = await resolveLabels(supabase, chunks);

    const contextBlock = chunks
      .map((chunk, i) => {
        const label = labels.get(`${chunk.source_type}:${chunk.source_id}`) ?? chunk.source_id;
        return `[${i + 1}] (${chunk.source_type}: ${label})\n${chunk.content}`;
      })
      .join("\n\n");

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system:
        "You are Sola, an assistant for Bethel Divine Healthcare Services. Answer the user's question using ONLY the provided context below. If the answer isn't in the context, say so clearly — do not guess. Cite which numbered source each part of your answer came from, e.g. [1].",
      messages: [
        {
          role: "user",
          content: `Context:\n\n${contextBlock}\n\nQuestion: ${question}`,
        },
      ],
    });

    const content = response.content[0];
    const answer = content.type === "text" ? content.text : "";

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

    return NextResponse.json({ answer, citations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai/chat] failed:", message);
    return NextResponse.json({ error: `Failed to answer: ${message}` }, { status: 500 });
  }
}
