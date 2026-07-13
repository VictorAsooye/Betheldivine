export interface SignatureFontPreset {
  id: string;
  label: string;
  fontFamily: string;
}

// CSS variables are registered globally on <body> in app/layout.tsx.
export const SIGNATURE_FONTS: SignatureFontPreset[] = [
  { id: "dancing-script", label: "Dancing Script", fontFamily: "var(--font-dancing-script)" },
  { id: "caveat", label: "Caveat", fontFamily: "var(--font-caveat)" },
  { id: "sacramento", label: "Sacramento", fontFamily: "var(--font-sacramento)" },
  { id: "pacifico", label: "Pacifico", fontFamily: "var(--font-pacifico)" },
];

export function fontForId(fontId: string | null | undefined): SignatureFontPreset {
  return SIGNATURE_FONTS.find((f) => f.id === fontId) ?? SIGNATURE_FONTS[0];
}
