import PageHeader from "./PageHeader";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  phase: string;
}

export default function PlaceholderPage({ title, subtitle, phase }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="p-8">
        <div
          className="bg-white rounded-xl border p-12 flex flex-col items-center justify-center text-center"
          style={{ borderColor: "#dce2ec", borderStyle: "dashed" }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "#f7f9fc", border: "2px solid #dce2ec" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e9ab0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
          >
            {title}
          </h2>
          <p className="text-sm font-sans max-w-sm" style={{ color: "#8e9ab0" }}>
            This section is coming in <strong style={{ color: "#c8991a" }}>{phase}</strong>.
            The structure and routing is already in place.
          </p>
        </div>
      </div>
    </div>
  );
}
