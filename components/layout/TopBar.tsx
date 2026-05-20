interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header className="bg-paper border-b border-navy/10 h-14 flex items-center px-6 flex-shrink-0">
      <div className="min-w-0">
        <h1 className="text-[15px] font-medium text-ink leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[12px] text-muted leading-tight truncate">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}
