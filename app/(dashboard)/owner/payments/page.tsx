import PageHeader from "@/components/PageHeader";
import PaymentsDashboard from "@/components/PaymentsDashboard";

export default function OwnerPaymentsPage() {
  return (
    <div>
      <PageHeader title="Payments" subtitle="Client billing and payment oversight" />
      <PaymentsDashboard />
    </div>
  );
}
