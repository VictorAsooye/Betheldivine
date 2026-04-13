import PageHeader from "@/components/PageHeader";
import WeeklyCalendar from "@/components/WeeklyCalendar";

export default function EmployeeSchedulePage() {
  return (
    <div>
      <PageHeader title="My Schedule" subtitle="Your upcoming and past shifts" />
      <div className="p-8">
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
          <WeeklyCalendar showEmployee={false} />
        </div>
      </div>
    </div>
  );
}
