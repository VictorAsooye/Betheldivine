export type SignatureKind = "typed" | "drawn";

export interface SignatureValue {
  kind: SignatureKind;
  value: string; // typed: the name text; drawn: base64 PNG data URI
  font_id?: string | null; // preset font id, typed signatures only
}

export function isImageDataUri(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("data:image/");
}

function asSignatureValue(raw: unknown): SignatureValue | null {
  if (raw && typeof raw === "object" && "kind" in (raw as Record<string, unknown>)) {
    return raw as SignatureValue;
  }
  return null;
}

// Handles both the new SignatureValue shape and legacy plain-string values
// (pre-signature Client Care Plan submissions stored a typed name directly).
export function signatureText(raw: unknown): string | null {
  const sig = asSignatureValue(raw);
  if (sig) return sig.kind === "typed" ? sig.value : null;
  if (typeof raw === "string" && !isImageDataUri(raw)) return raw;
  return null;
}

export function signatureImageSrc(raw: unknown): string | null {
  const sig = asSignatureValue(raw);
  if (sig) return sig.kind === "drawn" ? sig.value : null;
  if (typeof raw === "string" && isImageDataUri(raw)) return raw;
  return null;
}
