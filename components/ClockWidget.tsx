"use client";

import { useEffect, useState, useCallback } from "react";

interface Shift {
  id: string;
  client_id: string;
  scheduled_start: string;
  scheduled_end: string;
  clients?: { id: string; profiles?: { full_name?: string } } | null;
}

interface ClockStatus {
  clocked_in: boolean;
  no_employee_record?: boolean;
  clock_in_time?: string;
  clock_event_id?: string;
  shift_id?: string;
  client_id?: string;
  client_name?: string;
  employee_id?: string;
  today_shift?: Shift | null;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ClockWidget() {
  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/clock/status");
    const data = await res.json();
    setStatus(data);
    setLoading(false);
    if (data.clocked_in && data.clock_in_time) {
      setElapsed(Date.now() - new Date(data.clock_in_time).getTime());
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Tick timer while clocked in
  useEffect(() => {
    if (!status?.clocked_in) return;
    const timer = setInterval(() => {
      if (status.clock_in_time) {
        setElapsed(Date.now() - new Date(status.clock_in_time).getTime());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  async function getLocation(): Promise<{ lat: number | null; lng: number | null }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGeoError("Geolocation not supported — location not captured.");
        resolve({ lat: null, lng: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          setGeoError("Location access denied — location not captured.");
          resolve({ lat: null, lng: null });
        },
        { timeout: 8000 }
      );
    });
  }

  async function handleClockIn() {
    setError(null);
    setGeoError(null);
    setActionLoading(true);

    const shift = status?.today_shift;
    if (!shift) {
      setError("No scheduled shift found for today. Contact your supervisor.");
      setActionLoading(false);
      return;
    }

    const { lat, lng } = await getLocation();

    const res = await fetch("/api/clock/in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat,
        lng,
        shift_id: shift.id,
        client_id: shift.client_id,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to clock in.");
      setActionLoading(false);
      return;
    }

    await fetchStatus();
    setActionLoading(false);
  }

  async function handleClockOut() {
    setError(null);
    setGeoError(null);
    setActionLoading(true);

    if (!status?.client_id) {
      setError("Missing clock-in data. Please contact your supervisor.");
      setActionLoading(false);
      return;
    }

    const { lat, lng } = await getLocation();

    const res = await fetch("/api/clock/out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat,
        lng,
        shift_id: status.shift_id ?? null,
        client_id: status.client_id,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to clock out.");
      setActionLoading(false);
      return;
    }

    await fetchStatus();
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6 animate-pulse" style={{ borderColor: "#dce2ec" }}>
        <div className="h-4 rounded w-1/3 mb-4" style={{ backgroundColor: "#dce2ec" }} />
        <div className="h-10 rounded w-1/2" style={{ backgroundColor: "#dce2ec" }} />
      </div>
    );
  }

  if (status?.no_employee_record) {
    return (
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
        <h2 className="text-base font-semibold mb-2" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
          Clock In / Clock Out
        </h2>
        <div className="rounded-lg px-4 py-3 text-sm font-sans" style={{ backgroundColor: "#fdf8ec", color: "#c8991a", border: "1px solid #e8b830" }}>
          Your employee record has not been set up yet. Please contact your administrator.
        </div>
      </div>
    );
  }

  const shift = status?.today_shift;

  return (
    <div
      className="bg-white rounded-xl border overflow-hidden"
      style={{ borderColor: status?.clocked_in ? "#2d8a5e" : "#dce2ec", borderWidth: status?.clocked_in ? 2 : 1 }}
    >
      {/* Status bar */}
      <div
        className="px-6 py-3 flex items-center gap-2"
        style={{ backgroundColor: status?.clocked_in ? "#f0faf5" : "#f7f9fc" }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: status?.clocked_in ? "#2d8a5e" : "#8e9ab0" }}
        />
        <span className="text-xs font-semibold uppercase tracking-wider font-sans" style={{ color: status?.clocked_in ? "#2d8a5e" : "#8e9ab0" }}>
          {status?.clocked_in ? "On Duty" : "Off Duty"}
        </span>
        {status?.clocked_in && (
          <span className="ml-auto text-sm font-mono font-semibold" style={{ color: "#2d8a5e" }}>
            {formatElapsed(elapsed)}
          </span>
        )}
      </div>

      <div className="px-6 py-5">
        {status?.clocked_in ? (
          <>
            <p className="text-sm font-sans mb-1" style={{ color: "#8e9ab0" }}>
              Clocked in at <strong style={{ color: "#1a2e4a" }}>{formatTime(status.clock_in_time!)}</strong>
            </p>
            <p className="text-sm font-sans mb-5" style={{ color: "#8e9ab0" }}>
              Client: <strong style={{ color: "#1a2e4a" }}>{status.client_name}</strong>
            </p>
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold font-sans transition-all disabled:opacity-60"
              style={{ backgroundColor: actionLoading ? "#8e9ab0" : "#c0392b" }}
            >
              {actionLoading ? "Clocking Out…" : "Clock Out"}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold mb-1" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Ready to start your shift?
            </h2>
            {shift ? (
              <p className="text-sm font-sans mb-5" style={{ color: "#8e9ab0" }}>
                Today: <strong style={{ color: "#1a2e4a" }}>
                  {(shift.clients as { profiles?: { full_name?: string } } | null)?.profiles?.full_name ?? "Assigned Client"}
                </strong>
                {" · "}
                {formatTime(shift.scheduled_start)} – {formatTime(shift.scheduled_end)}
              </p>
            ) : (
              <p className="text-sm font-sans mb-5" style={{ color: "#8e9ab0" }}>
                No shift scheduled for today.
              </p>
            )}
            <button
              onClick={handleClockIn}
              disabled={actionLoading || !shift}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold font-sans transition-all disabled:opacity-50"
              style={{ backgroundColor: actionLoading || !shift ? "#8e9ab0" : "#2d8a5e" }}
            >
              {actionLoading ? "Clocking In…" : "Clock In"}
            </button>
          </>
        )}

        {error && (
          <p className="mt-3 text-xs font-sans px-3 py-2 rounded-lg" style={{ color: "#c0392b", backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}>
            {error}
          </p>
        )}
        {geoError && (
          <p className="mt-2 text-xs font-sans" style={{ color: "#8e9ab0" }}>
            ⚠ {geoError}
          </p>
        )}
      </div>
    </div>
  );
}
