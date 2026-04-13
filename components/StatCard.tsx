interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: string;
}

export default function StatCard({ label, value, icon, accent = "#1a2e4a" }: StatCardProps) {
  return (
    <div
      className="bg-white rounded-xl px-6 py-5 border"
      style={{ borderColor: "#dce2ec" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider font-sans" style={{ color: "#8e9ab0" }}>
          {label}
        </p>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            {icon}
          </div>
        )}
      </div>
      <p
        className="text-3xl font-bold"
        style={{ color: accent, fontFamily: "var(--font-lora), Georgia, serif" }}
      >
        {value}
      </p>
    </div>
  );
}
