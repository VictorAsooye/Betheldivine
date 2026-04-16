"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

interface Client {
  id: string;
  date_of_birth?: string;
  address?: string;
  assigned_employees?: string[];
  created_at: string;
  profiles?: { full_name?: string; email?: string };
}

function age(dob?: string): string {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))} yrs`;
}

export default function OwnerClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function fetchClients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to load clients");
      const d = await res.json();
      setClients(Array.isArray(d) ? d : []);
    } catch {
      setError("Could not load clients. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter((c) => {
    const name = (c.profiles as { full_name?: string } | null | undefined)?.full_name?.toLowerCase() ?? "";
    const email = (c.profiles as { email?: string } | null | undefined)?.email?.toLowerCase() ?? "";
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q) || (c.address ?? "").toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="All active clients"
        action={
          <Link
            href="/owner/clients/new"
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold font-sans"
            style={{ backgroundColor: "#1a2e4a" }}
          >
            + Add Client
          </Link>
        }
      />
      <div className="p-8">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-4 py-2.5 rounded-lg border text-sm font-sans outline-none"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#ffffff" }}
          />
        </div>

        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
          <div className="grid grid-cols-5 px-6 py-3 border-b text-xs font-semibold uppercase tracking-wide font-sans"
            style={{ borderColor: "#dce2ec", color: "#8e9ab0", backgroundColor: "#f7f9fc" }}>
            <span className="col-span-2">Client</span>
            <span>Age</span>
            <span>Assigned Staff</span>
            <span></span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ backgroundColor: "#f7f9fc" }} />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
              <button onClick={fetchClients} className="text-sm font-semibold font-sans underline" style={{ color: "#1a2e4a" }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
                {search ? "No clients match your search." : "No clients yet. Add the first one."}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#dce2ec" }}>
              {filtered.map((client) => {
                const p = client.profiles as { full_name?: string; email?: string } | null | undefined;
                return (
                  <div key={client.id} className="grid grid-cols-5 px-6 py-4 items-center">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                        style={{ backgroundColor: "#2AADAD" }}>
                        {p?.full_name?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>{p?.full_name ?? "—"}</p>
                        <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{p?.email}</p>
                      </div>
                    </div>
                    <p className="text-sm font-sans" style={{ color: "#1a2e4a" }}>{age(client.date_of_birth)}</p>
                    <p className="text-sm font-sans" style={{ color: "#1a2e4a" }}>
                      {client.assigned_employees?.length ?? 0} employee{(client.assigned_employees?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                    <div className="flex justify-end">
                      <Link
                        href={`/owner/clients/${client.id}`}
                        className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
