import Image from "next/image";

interface BethelLogoProps {
  /** "full" = icon + wordmark (logo 1); "icon" = icon only (logo 2) */
  variant?: "full" | "icon";
  /** Overall width in px */
  width?: number;
  className?: string;
}

export default function BethelLogo({
  variant = "full",
  width,
  className = "",
}: BethelLogoProps) {
  if (variant === "icon") {
    const size = width ?? 40;
    return (
      <Image
        src="/logo-icon.png"
        alt="Bethel Divine Healthcare Services"
        width={size}
        height={size}
        className={className}
        priority
      />
    );
  }

  // Full wordmark — logo 1 has roughly a 4.1:1 aspect ratio
  const w = width ?? 210;
  const h = Math.round(w / 4.1);

  return (
    <Image
      src="/logo-full.png"
      alt="Bethel Divine Healthcare Services LLC"
      width={w}
      height={h}
      className={className}
      priority
    />
  );
}
