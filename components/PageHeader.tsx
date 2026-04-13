"use client";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export default function PageHeader({ title, subtitle, action, actionLabel, onAction }: PageHeaderProps) {
  return (
    <div
      className="flex items-start justify-between px-8 py-6 border-b bg-white"
      style={{ borderColor: "#dce2ec" }}
    >
      <div>
        <h1
          className="text-2xl font-bold"
          style={{
            color: "#1a2e4a",
            fontFamily: "var(--font-lora), Georgia, serif",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5 font-sans" style={{ color: "#8e9ab0" }}>
            {subtitle}
          </p>
        )}
      </div>
      {(action || (actionLabel && onAction)) && (
        <div>
          {action ?? (
            <button
              onClick={onAction}
              className="px-5 py-2 rounded-lg text-white text-sm font-semibold font-sans"
              style={{ backgroundColor: "#1a2e4a" }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
