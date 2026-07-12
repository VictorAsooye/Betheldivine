// Voyage AI embeddings client. Anthropic does not offer a native embeddings
// API and recommends Voyage AI for this. Uses voyage-context-4's
// contextualized embeddings — each chunk is embedded with awareness of the
// full document, so no manual overlap-window chunking is needed. Degrades
// gracefully (returns null) when VOYAGE_API_KEY is not set, matching the
// pattern used elsewhere in this codebase for optional third-party
// integrations.

const VOYAGE_MODEL = "voyage-context-4";
const VOYAGE_URL = "https://api.voyageai.com/v1/contextualizedembeddings";

interface ContextualizedEmbeddingsResponse {
  data: Array<{
    index: number;
    data: Array<{ embedding: number[]; index: number }>;
  }>;
}

async function callVoyage(
  inputs: string[][],
  inputType: "document" | "query"
): Promise<ContextualizedEmbeddingsResponse["data"] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey || inputs.length === 0) return null;

  const response = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs,
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Voyage embeddings request failed (${response.status}): ${errorText}`);
  }

  const data: ContextualizedEmbeddingsResponse = await response.json();
  return data.data;
}

// Embeds every chunk of a single document together so Voyage can encode
// full-document context into each chunk's vector.
export async function embedDocument(chunks: string[]): Promise<number[][] | null> {
  const result = await callVoyage([chunks], "document");
  if (!result) return null;
  return result[0].data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function embedQuery(query: string): Promise<number[] | null> {
  const result = await callVoyage([[query]], "query");
  if (!result) return null;
  return result[0].data[0].embedding;
}
