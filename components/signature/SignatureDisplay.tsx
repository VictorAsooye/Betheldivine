import { fontForId } from "@/components/signature/fonts";
import type { SignatureValue } from "@/components/signature/types";

interface Props {
  signature: SignatureValue | null | undefined;
  className?: string;
}

export default function SignatureDisplay({ signature, className }: Props) {
  if (!signature) {
    return <p className={`text-[13px] text-muted italic ${className ?? ""}`}>No signature yet</p>;
  }

  if (signature.kind === "drawn") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={signature.value}
        alt="Signature"
        className={`h-14 w-auto object-contain ${className ?? ""}`}
      />
    );
  }

  const font = fontForId(signature.font_id);
  return (
    <p
      className={`text-[30px] leading-none text-ink ${className ?? ""}`}
      style={{ fontFamily: font.fontFamily }}
    >
      {signature.value}
    </p>
  );
}
