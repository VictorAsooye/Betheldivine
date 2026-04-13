"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

interface Client {
  id: string;
  date_of_birth?: string;
  address?: string;
  profiles?: { full_name?: string; email?: string };
}

function age(dob?: string): string {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))} yrs`;
}

export default function EmployeeClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchClients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to load clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load your clients. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchClients(); }, []);

  return (
    <div>
      <PageHeader title="My Clients" subtitle="Your assigned clients and care plans" />
      <div className="p-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border p-5 animate-pulse h-20" style={{ borderColor: "#dce2ec" }} />
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border p-12 text-center space-y-3" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
            <button onClick={fetchClients} className="text-sm font-semibold font-sans underline" style={{ color: "#1a2e4a" }}>Retry</button>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
              No clients assigned yet. Contact your supervisor.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/employee/clients/${client.id}`}
                className="block bg-white rounded-xl border p-5 transition-shadow hover:shadow-md"
                style={{ borderColor: "#dce2ec" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: "#1a2e4a" }}
                    >
                      {client.profiles?.full_name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-semibold font-sans text-sm" style={{ color: "#1a2e4a" }}>
                        {client.profiles?.full_name ?? "Unknown"}
                      </p>
                      <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>
                        {client.profiles?.email} · Age: {age(client.date_of_birth)}
                      </p>
                      {client.address && (
                        <p className="text-xs font-sans mt-0.5" style={{ color: "#8e9ab0" }}>
                          {client.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e9ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
