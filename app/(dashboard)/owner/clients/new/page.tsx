"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

interface Employee {
  id: string;
  position?: string;
  profiles?: { full_name?: string };
}

export default function NewClientPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    date_of_birth: "",
    address: "",
    emergency_name: "",
    emergency_phone: "",
    emergency_relation: "",
    insurance_provider: "",
    insurance_id: "",
    assigned_employees: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then((d) => setEmployees(Array.isArray(d) ? d : []));
  }, []);

  function toggleEmployee(id: string) {
    setForm((f) => ({
      ...f,
      assigned_employees: f.assigned_employees.includes(id)
        ? f.assigned_employees.filter((e) => e !== id)
        : [...f.assigned_employees, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      full_name: form.full_name,
      email: form.email,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      emergency_contact: {
        name: form.emergency_name || null,
        phone: form.emergency_phone || null,
        relation: form.emergency_relation || null,
      },
      insurance_info: {
        provider: form.insurance_provider || null,
        id: form.insurance_id || null,
      },
      assigned_employees: form.assigned_employees,
    };

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to create client.");
      setLoading(false);
      return;
    }

    router.push("/owner/clients");
  }

  const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none";
  const inputStyle = { borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" };
  const labelStyle = { color: "#1a2e4a" };

  return (
    <div>
      <PageHeader
        title="Add New Client"
        subtitle="Create a client record"
        action={
          <Link href="/owner/clients" className="text-sm font-sans font-semibold px-4 py-2 rounded-lg border"
            style={{ borderColor: "#dce2ec", color: "#8e9ab0" }}>
            ← Back
          </Link>
        }
      />
      <div className="p-8">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* Account info */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Account Information
            </h2>
            <p className="text-xs font-sans mb-4" style={{ color: "#8e9ab0" }}>
              The client must have already registered at <strong>/register</strong> before you can add them here.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Full Name</label>
                <input required type="text" value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jane Smith" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Email Address</label>
                <input required type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@email.com" className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Personal Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Date of Birth</label>
                <input type="date" value={form.date_of_birth}
                  onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Address</label>
                <input type="text" value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St, Baltimore, MD 21201" className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Emergency contact */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Emergency Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Name</label>
                <input type="text" value={form.emergency_name}
                  onChange={(e) => setForm((f) => ({ ...f, emergency_name: e.target.value }))}
                  placeholder="John Smith" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Phone</label>
                <input type="tel" value={form.emergency_phone}
                  onChange={(e) => setForm((f) => ({ ...f, emergency_phone: e.target.value }))}
                  placeholder="(410) 555-0100" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Relation</label>
                <input type="text" value={form.emergency_relation}
                  onChange={(e) => setForm((f) => ({ ...f, emergency_relation: e.target.value }))}
                  placeholder="Spouse, Child, etc." className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Insurance Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Provider</label>
                <input type="text" value={form.insurance_provider}
                  onChange={(e) => setForm((f) => ({ ...f, insurance_provider: e.target.value }))}
                  placeholder="Medicaid, Medicare, etc." className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Member ID</label>
                <input type="text" value={form.insurance_id}
                  onChange={(e) => setForm((f) => ({ ...f, insurance_id: e.target.value }))}
                  placeholder="Insurance ID number" className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Assigned employees */}
          {employees.length > 0 && (
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
                Assign Employees
              </h2>
              <div className="space-y-2">
                {employees.map((emp) => {
                  const checked = form.assigned_employees.includes(emp.id);
                  return (
                    <label key={emp.id} className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer"
                      style={{ backgroundColor: checked ? "#f0f4ff" : "#f7f9fc", border: `1px solid ${checked ? "#1a2e4a" : "#dce2ec"}` }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleEmployee(emp.id)}
                        className="w-4 h-4 accent-navy" />
                      <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>
                        {emp.profiles?.full_name ?? emp.id}
                        {emp.position ? <span style={{ color: "#8e9ab0" }}> — {emp.position}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm font-sans" style={{ color: "#c0392b", backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}>
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/owner/clients"
              className="px-6 py-2.5 rounded-lg border text-sm font-semibold font-sans" style={{ borderColor: "#dce2ec", color: "#8e9ab0" }}>
              Cancel
            </Link>
            <button type="submit" disabled={loading}
              className="px-8 py-2.5 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-60" style={{ backgroundColor: "#1a2e4a" }}>
              {loading ? "Creating…" : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
