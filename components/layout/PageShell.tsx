import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

interface PageShellProps {
  children: React.ReactNode;
  role: "admin" | "owner" | "employee";
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  userName?: string | null;
}

export default function PageShell({
  children,
  role,
  title,
  subtitle,
  actions,
  userName,
}: PageShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-paper2">
      <Sidebar role={role} userName={userName} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
