"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import ShiftModal from "@/components/ShiftModal";

export default function OwnerSchedulePage() {
  const [showModal, setShowModal] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);

  return (
    <div>
      <PageHeader
        title="Shift Schedule"
        subtitle="Weekly view of all scheduled shifts"
        action={
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold font-sans"
            style={{ backgroundColor: "#1a2e4a" }}
          >
            + Schedule Shift
          </button>
        }
      />
      <div className="p-8">
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
          <WeeklyCalendar key={calendarKey} showEmployee={true} />
        </div>
      </div>
      {showModal && (
        <ShiftModal
          onClose={() => setShowModal(false)}
          onCreated={() => setCalendarKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
