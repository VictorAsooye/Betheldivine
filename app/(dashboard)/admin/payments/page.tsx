import PageHeader from "@/components/PageHeader";
import PaymentsDashboard from "@/components/PaymentsDashboard";

export default function AdminPaymentsPage() {
  return (
    <div>
      <PageHeader title="Payments" subtitle="Client billing and payment oversight" />
      <PaymentsDashboard />
    </div>
  );
}
