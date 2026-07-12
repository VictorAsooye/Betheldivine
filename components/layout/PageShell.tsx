import TopNav from "@/components/layout/TopNav";

interface PageShellProps {
  children: React.ReactNode;
  role: "admin" | "owner" | "employee";
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  userName?: string | null;
  backHref?: string;
  backLabel?: string;
}

export default function PageShell({
  children,
  role,
  title,
  subtitle,
  actions,
  userName,
  backHref,
  backLabel,
}: PageShellProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper2">
      <TopNav role={role} userName={userName} title={title} subtitle={subtitle} actions={actions} backHref={backHref} backLabel={backLabel} />
      <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">{children}</main>
    </div>
  );
}
