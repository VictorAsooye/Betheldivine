"use client";

import { useState } from "react";
import { BarChart3, CreditCard, ShieldCheck, Users, RefreshCw, Clock } from "lucide-react";

type ReportType = "operations" | "payment" | "compliance" | "employee";

interface Report {
  id: string;
  type: ReportType;
  content: string;
  created_at: string;
  generated_by: string;
}

const REPORT_TYPES: { type: ReportType; label: string; description: string; icon: React.ElementType; endpoint: string }[] = [
  {
    type: "operations",
    label: "Operations Summary",
    description: "7-day shift completion rates, missed shifts, staffing efficiency",
    icon: BarChart3,
    endpoint: "/api/ai/shift-summary",
  },
  {
    type: "payment",
    label: "Payment Summary",
    description: "Monthly collection rate, outstanding balances, QuickBooks sync status",
    icon: CreditCard,
    endpoint: "/api/ai/payment-summary",
  },
  {
    type: "compliance",
    label: "Compliance Report",
    description: "EVV verification rates, license expiry risks, remediation actions",
    icon: ShieldCheck,
    endpoint: "/api/ai/compliance-report",
  },
  {
    type: "employee",
    label: "Employee Summary",
    description: "30-day performance, completion rates, staffing trends, HR recommendations",
    icon: Users,
    endpoint: "/api/ai/employee-summary",
  },
];

const typeColors: Record<ReportType, string> = {
  operations: "bg-blue-100 text-blue-800",
  payment: "bg-green-100 text-green-800",
  compliance: "bg-amber-100 text-amber-800",
  employee: "bg-purple-100 text-purple-800",
};

interface Props {
  initialReports: Report[];
}

export default function ReportsDashboard({ initialReports }: Props) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(type: ReportType, endpoint: string) {
    setGenerating(type);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate report");
        return;
      }
      const newReport: Report = {
        id: crypto.randomUUID(),
        type,
        content: data.content,
        created_at: new Date().toISOString(),
        generated_by: "",
      };
      setReports((prev) => [newReport, ...prev]);
      setActiveReport(newReport);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate AI-powered insights from your operational data</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Generator cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORT_TYPES.map(({ type, label, description, icon: Icon, endpoint }) => (
          <div key={type} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1a2e4a]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#1a2e4a]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => generate(type, endpoint)}
              disabled={generating !== null}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-[#1a2e4a] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#243d60] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating === type ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Active report viewer */}
      {activeReport && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeColors[activeReport.type]}`}>
                {REPORT_TYPES.find((r) => r.type === activeReport.type)?.label}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(activeReport.created_at).toLocaleString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                  hour: "numeric", minute: "2-digit",
                })}
              </span>
            </div>
            <button
              onClick={() => setActiveReport(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
          <div className="px-6 py-5">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {activeReport.content}
            </pre>
          </div>
        </div>
      )}

      {/* Report history */}
      {reports.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Report History</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReport(r)}
                className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[r.type]}`}>
                    {REPORT_TYPES.find((x) => x.type === r.type)?.label}
                  </span>
                  <span className="text-sm text-gray-500 truncate max-w-xs hidden sm:block">
                    {r.content.slice(0, 80)}…
                  </span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
