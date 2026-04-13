"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";

interface Employee {
  id: string;
  hire_date?: string;
  position?: string;
  hourly_rate?: number;
  assigned_clients?: string[];
  created_at: string;
  profiles?: { full_name?: string; email?: string; is_active?: boolean };
}

export default function OwnerEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function fetchEmployees() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Failed to load employees");
      const d = await res.json();
      setEmployees(Array.isArray(d) ? d : []);
    } catch {
      setError("Could not load employees. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchEmployees(); }, []);

  const filtered = employees.filter((e) => {
    const name = (e.profiles as { full_name?: string } | null | undefined)?.full_name?.toLowerCase() ?? "";
    const email = (e.profiles as { email?: string } | null | undefined)?.email?.toLowerCase() ?? "";
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q) || (e.position ?? "").toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader title="Employees" subtitle="Your care team roster" />
      <div className="p-8">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-4 py-2.5 rounded-lg border text-sm font-sans outline-none"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#ffffff" }}
          />
        </div>

        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
          {/* Table header */}
          <div className="grid grid-cols-5 px-6 py-3 border-b text-xs font-semibold uppercase tracking-wide font-sans"
            style={{ borderColor: "#dce2ec", color: "#8e9ab0", backgroundColor: "#f7f9fc" }}>
            <span className="col-span-2">Employee</span>
            <span>Position</span>
            <span>Rate / hr</span>
            <span>Clients</span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ backgroundColor: "#f7f9fc" }} />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
              <button onClick={fetchEmployees} className="text-sm font-semibold font-sans underline" style={{ color: "#1a2e4a" }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
                {search ? "No employees match your search." : "No employee records yet. Employees must register and be set up via the Users page."}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#dce2ec" }}>
              {filtered.map((emp) => {
                const p = emp.profiles as { full_name?: string; email?: string; is_active?: boolean } | null | undefined;
                return (
                  <div key={emp.id} className="grid grid-cols-5 px-6 py-4 items-center">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                        style={{ backgroundColor: "#1a2e4a" }}>
                        {p?.full_name?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>{p?.full_name ?? "—"}</p>
                        <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{p?.email}</p>
                      </div>
                    </div>
                    <p className="text-sm font-sans" style={{ color: "#1a2e4a" }}>{emp.position ?? "—"}</p>
                    <p className="text-sm font-sans" style={{ color: "#1a2e4a" }}>
                      {emp.hourly_rate ? `$${Number(emp.hourly_rate).toFixed(2)}` : "—"}
                    </p>
                    <p className="text-sm font-sans" style={{ color: "#1a2e4a" }}>
                      {emp.assigned_clients?.length ?? 0}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <p className="text-xs font-sans mt-3" style={{ color: "#8e9ab0" }}>
          To add an employee, go to Admin → Users and set a user&apos;s role to Employee.
        </p>
      </div>
    </div>
  );
}
