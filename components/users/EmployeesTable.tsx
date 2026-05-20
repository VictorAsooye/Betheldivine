"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: string;
  position?: string | null;
  hourly_rate?: number | null;
  assigned_clients?: string[];
  profiles?: { full_name?: string; email?: string; is_active?: boolean } | null;
}

export default function EmployeesTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then((d) => {
      setEmployees(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.profiles?.full_name ?? "").toLowerCase().includes(q) ||
      (e.profiles?.email ?? "").toLowerCase().includes(q) ||
      (e.position ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or position…"
        className="w-full max-w-sm bg-paper border border-line2 rounded-lg px-3 py-2 text-[13px] text-ink outline-none"
      />

      <div className="bg-paper border border-line2 rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 px-6 py-3 border-b border-line bg-paper2 text-[11px] uppercase tracking-wide text-muted">
          <span className="col-span-2">Employee</span>
          <span>Position</span>
          <span>Rate / hr</span>
          <span>Status</span>
        </div>
        {loading ? (
          <p className="text-[13px] text-muted p-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-[13px] text-muted p-8 text-center">No employees found.</p>
        ) : (
          filtered.map((emp) => {
            const p = emp.profiles;
            return (
              <div key={emp.id} className="grid grid-cols-5 px-6 py-4 items-center border-b border-line last:border-b-0 hover:bg-paper2">
                <div className="col-span-2 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[12px] font-semibold">{p?.full_name?.charAt(0).toUpperCase() ?? "?"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-ink2 font-medium truncate">{p?.full_name ?? "—"}</p>
                    <p className="text-[12px] text-muted truncate">{p?.email}</p>
                  </div>
                </div>
                <span className="text-[13px] text-ink2">{emp.position ?? "—"}</span>
                <span className="text-[13px] text-ink2">{emp.hourly_rate ? `$${Number(emp.hourly_rate).toFixed(2)}` : "—"}</span>
                <span>
                  {p?.is_active ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-success-bg text-success-text">Active</span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-paper2 text-muted">Inactive</span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
      <p className="text-[12px] text-muted">To add an employee, go to Users and set a user&apos;s role to Employee.</p>
    </div>
  );
}
