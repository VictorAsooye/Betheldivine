import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import PageShell from "@/components/layout/PageShell";
import { getCarePlanAlertData } from "@/lib/care-plans/stale-clients";
import WelcomeBanner from "@/components/onboarding/WelcomeBanner";
import SetupChecklist from "@/components/onboarding/SetupChecklist";
import NextStepCard from "@/components/onboarding/NextStepCard";
import SolaSupportChat from "@/components/chat/SolaSupportChat";
import {
  AlertTriangle,
  FileText,
  Shield,
  Palette,
  Send,
  Upload,
  type LucideIcon,
} from "lucide-react";

function statusFromExpiry(expiry: string): "expired" | "soon" | "current" {
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "current";
}

interface LicenseRow {
  id: string;
  license_name: string;
  expiry_date: string;
  profiles?: { full_name?: string } | null;
}

export default async function OwnerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const profilePromise = user
    ? service.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : Promise.resolve({ data: null });

  const brandingPromise = user
    ? service
        .from("company_branding")
        .select("company_name")
        .eq("org_id", user.id)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [
    profileRes,
    brandingRes,
    { count: formCount },
    { count: submissionsTotal },
    { count: licenseCount },
    { count: documentCount },
    { data: expiringLicenses },
    pickUpRes,
    carePlanData,
  ] = await Promise.all([
    profilePromise,
    brandingPromise,
    service.from("forms").select("*", { count: "exact", head: true }).eq("is_active", true),
    service.from("form_submissions").select("*", { count: "exact", head: true }),
    service.from("licenses").select("*", { count: "exact", head: true }),
    service.from("documents").select("*", { count: "exact", head: true }),
    service
      .from("licenses")
      .select("id, license_name, expiry_date, profiles!licenses_holder_id_fkey(full_name)")
      .order("expiry_date", { ascending: true })
      .limit(4),
    service
      .from("static_form_submissions")
      .select("id, form_type, submitted_by, created_at")
      .not("submitted_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getCarePlanAlertData(),
  ]);

  const profile = (profileRes as { data: { full_name?: string } | null }).data;
  const licenses = (expiringLicenses as LicenseRow[] | null) ?? [];

  const pickUp = (pickUpRes as { data: { id: string; form_type: string; submitted_by: string; created_at: string } | null }).data;

  // Alert bars (max 2).
  const expiredLicense = licenses.find((l) => statusFromExpiry(l.expiry_date) === "expired");
  const overdueCarePlan = carePlanData.stalePlans[0] ?? carePlanData.noPlans[0] ?? null;

  // Onboarding setup state.
  const branding = (brandingRes as { data: { company_name?: string } | null }).data;
  const companyName = branding?.company_name ?? "Bethel Divine";
  const hasBranding = !!branding;
  const hasLicense = (licenseCount ?? 0) > 0;
  const hasForm = (formCount ?? 0) > 0;
  const hasFormSent = (submissionsTotal ?? 0) > 0;
  const hasDocument = (documentCount ?? 0) > 0;

  const setupSteps: Array<{
    done: boolean;
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
  }> = [
    { done: hasBranding, title: "Set up your branding", description: "Add your logo, colors, and company details.", href: "/owner/settings/branding", icon: Palette },
    { done: hasLicense, title: "Add your first license", description: "Track credentials and get expiry alerts.", href: "/owner/licenses/add", icon: Shield },
    { done: hasForm, title: "Create a form with Sola AI", description: "Describe it in plain English — built in seconds.", href: "/owner/forms", icon: FileText },
    { done: hasFormSent, title: "Send your first form", description: "Get a response from your team right away.", href: "/owner/forms", icon: Send },
    { done: hasDocument, title: "Upload your first document", description: "Keep policies and records in one place.", href: "/owner/documents/upload", icon: Upload },
  ];
  const nextStep = setupSteps.find((s) => !s.done) ?? null;

  return (
    <PageShell role="owner" title="Operations Dashboard" subtitle="Manage your team, clients, and compliance" userName={profile?.full_name}>
      <div className="space-y-4 max-w-6xl">
        {/* Onboarding */}
        <WelcomeBanner companyName={companyName} />
        <SetupChecklist
          hasBranding={hasBranding}
          hasLicense={hasLicense}
          hasForm={hasForm}
          hasFormSent={hasFormSent}
          hasDocument={hasDocument}
        />
        {nextStep && (
          <NextStepCard
            title={nextStep.title}
            description={nextStep.description}
            href={nextStep.href}
            icon={<nextStep.icon className="w-8 h-8 text-slate flex-shrink-0" />}
          />
        )}

        {/* Alert bars */}
        {expiredLicense && (
          <div className="w-full bg-warning-bg border border-warning-border rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="size-4 text-warning-text flex-shrink-0" />
            <p className="text-[13px] text-warning-text">
              {expiredLicense.license_name} held by {expiredLicense.profiles?.full_name ?? "Organization"} is expired — action needed.{" "}
              <Link href="/owner/licenses" className="text-gold font-medium">Start renewal →</Link>
            </p>
          </div>
        )}
        {overdueCarePlan && (
          <div className="w-full bg-warning-bg border border-warning-border rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="size-4 text-warning-text flex-shrink-0" />
            <p className="text-[13px] text-warning-text">
              {overdueCarePlan.clientName}&apos;s care plan is overdue —{" "}
              {overdueCarePlan.status === "no_plan"
                ? "no plan on file"
                : `last updated ${overdueCarePlan.daysSincePlan} days ago`}
              .{" "}
              <Link href="/owner/forms?open=client_care_plan" className="text-gold font-medium">Send form →</Link>
            </p>
          </div>
        )}

        <SolaSupportChat
          role="owner"
          lastFormHref={pickUp ? "/owner/forms" : null}
          lastFormLabel={pickUp?.form_type.replace(/_/g, " ")}
        />
      </div>
    </PageShell>
  );
}
