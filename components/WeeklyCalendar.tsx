"use client";

import { useEffect, useState, useCallback } from "react";

interface ShiftEmployee {
  profiles?: { full_name?: string };
}
interface ShiftClient {
  profiles?: { full_name?: string };
}
interface Shift {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  evv_verified: boolean;
  notes?: string;
  employees?: ShiftEmployee | ShiftEmployee[];
  clients?: ShiftClient | ShiftClient[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "#f0f4ff", text: "#1a2e4a", border: "#8e9ab0" },
  active:    { bg: "#f0faf5", text: "#2d8a5e", border: "#2d8a5e" },
  completed: { bg: "#f7f9fc", text: "#8e9ab0", border: "#dce2ec" },
  missed:    { bg: "#fef2f2", text: "#c0392b", border: "#fca5a5" },
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDay(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function getEmpName(shift: Shift): string {
  const e = Array.isArray(shift.employees) ? shift.employees[0] : shift.employees;
  return e?.profiles?.full_name ?? "—";
}
function getClientName(shift: Shift): string {
  const c = Array.isArray(shift.clients) ? shift.clients[0] : shift.clients;
  return c?.profiles?.full_name ?? "—";
}

interface Props {
  showEmployee?: boolean; // owner sees employee name, employee sees client name
}

export default function WeeklyCalendar({ showEmployee = true }: Props) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/shifts?week=${weekStart.toISOString()}`);
    const data = await res.json();
    setShifts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  function shiftsForDay(day: Date): Shift[] {
    const dayStr = day.toDateString();
    return shifts.filter((s) => new Date(s.scheduled_start).toDateString() === dayStr);
  }

  const totalThisWeek = shifts.length;
  const activeCount = shifts.filter((s) => s.status === "active").length;
  const completedCount = shifts.filter((s) => s.status === "completed").length;

  return (
    <div>
      {/* Header controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="w-8 h-8 rounded-lg flex items-center justify-center border font-sans text-sm transition-colors"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}
          >
            ‹
          </button>
          <span className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
            {fmtDay(weekStart)} – {fmtDay(addDays(weekStart, 6))}
          </span>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="w-8 h-8 rounded-lg flex items-center justify-center border font-sans text-sm transition-colors"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}
          >
            ›
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="px-3 py-1 rounded-lg text-xs font-semibold font-sans border transition-colors"
            style={{ borderColor: "#c8991a", color: "#c8991a" }}
          >
            Today
          </button>
        </div>
        <div className="flex gap-4 text-xs font-sans" style={{ color: "#8e9ab0" }}>
          <span><strong style={{ color: "#1a2e4a" }}>{totalThisWeek}</strong> shifts</span>
          <span><strong style={{ color: "#2d8a5e" }}>{activeCount}</strong> active</span>
          <span><strong style={{ color: "#8e9ab0" }}>{completedCount}</strong> done</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => (
            <div key={d.toISOString()} className="rounded-xl border p-3 min-h-[120px] animate-pulse" style={{ borderColor: "#dce2ec", backgroundColor: "#f7f9fc" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayShifts = shiftsForDay(day);

            return (
              <div
                key={day.toISOString()}
                className="rounded-xl border min-h-[120px] overflow-hidden"
                style={{
                  borderColor: isToday ? "#c8991a" : "#dce2ec",
                  borderWidth: isToday ? 2 : 1,
                  backgroundColor: "#ffffff",
                }}
              >
                {/* Day header */}
                <div
                  className="px-2 py-1.5 border-b"
                  style={{
                    borderColor: isToday ? "#c8991a" : "#dce2ec",
                    backgroundColor: isToday ? "#fdf8ec" : "#f7f9fc",
                  }}
                >
                  <p
                    className="text-xs font-semibold font-sans"
                    style={{ color: isToday ? "#c8991a" : "#8e9ab0" }}
                  >
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p
                    className="text-sm font-bold"
                    style={{ color: isToday ? "#c8991a" : "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
                  >
                    {day.getDate()}
                  </p>
                </div>

                {/* Shifts */}
                <div className="p-1.5 space-y-1">
                  {dayShifts.length === 0 && (
                    <p className="text-center text-xs font-sans py-3" style={{ color: "#dce2ec" }}>—</p>
                  )}
                  {dayShifts.map((shift) => {
                    const colors = STATUS_COLORS[shift.status] ?? STATUS_COLORS.scheduled;
                    return (
                      <div
                        key={shift.id}
                        className="rounded-lg px-2 py-1.5 border text-xs font-sans leading-tight"
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                          color: colors.text,
                        }}
                      >
                        <p className="font-semibold truncate">
                          {showEmployee ? getEmpName(shift) : getClientName(shift)}
                        </p>
                        <p className="truncate" style={{ color: "#8e9ab0", fontSize: "10px" }}>
                          {showEmployee ? getClientName(shift) : ""}
                        </p>
                        <p style={{ fontSize: "10px" }}>
                          {fmtTime(shift.scheduled_start)}–{fmtTime(shift.scheduled_end)}
                        </p>
                        {shift.evv_verified && (
                          <span className="text-green-600 font-semibold" style={{ fontSize: "9px" }}>EVV ✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
