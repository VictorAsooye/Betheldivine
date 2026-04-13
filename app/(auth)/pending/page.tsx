import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BethelLogo from "@/components/BethelLogo";

export default async function PendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // If they now have a real role, redirect to their dashboard
  if (profile?.role && profile.role !== "pending") {
    redirect(`/${profile.role}`);
  }

  const steps = [
    {
      label: "Account Created",
      description: "Your account has been registered in our system.",
      status: "complete",
    },
    {
      label: "Role Assignment",
      description: "An administrator will assign your role (employee, client, or owner).",
      status: "pending",
    },
    {
      label: "Dashboard Access",
      description: "Once your role is assigned, your personalized dashboard will be unlocked.",
      status: "waiting",
    },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#f7f9fc" }}
    >
      <div className="w-full max-w-lg">
        {/* Card */}
        <div
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: "1px solid #dce2ec" }}
        >
          {/* Gold top border */}
          <div className="h-1.5 w-full" style={{ backgroundColor: "#c8991a" }} />

          <div className="px-10 py-10">
            {/* Icon + Title */}
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: "#f7f9fc", border: "2px solid #dce2ec" }}
              >
                {/* Hourglass SVG */}
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#c8991a"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 22h14" />
                  <path d="M5 2h14" />
                  <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                  <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                </svg>
              </div>

              <h1
                className="text-2xl font-bold mb-2"
                style={{
                  color: "#1a2e4a",
                  fontFamily: "var(--font-lora), Georgia, serif",
                }}
              >
                Account Under Review
              </h1>
              <p className="text-sm font-sans leading-relaxed" style={{ color: "#8e9ab0" }}>
                {profile?.full_name ? (
                  <>
                    Thank you, <strong style={{ color: "#1a2e4a" }}>{profile.full_name}</strong>.
                    {" "}
                  </>
                ) : null}
                Your account has been created and is currently awaiting role assignment
                by an administrator. You will have full dashboard access once this step is complete.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step.label} className="flex gap-4">
                  {/* Step indicator column */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor:
                          step.status === "complete"
                            ? "#2d8a5e"
                            : step.status === "pending"
                            ? "#c8991a"
                            : "#dce2ec",
                        border:
                          step.status === "waiting"
                            ? "2px dashed #8e9ab0"
                            : "none",
                      }}
                    >
                      {step.status === "complete" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {step.status === "pending" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" fill="white" />
                        </svg>
                      )}
                      {step.status === "waiting" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e9ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className="w-px flex-1 my-1"
                        style={{
                          backgroundColor:
                            step.status === "complete" ? "#2d8a5e" : "#dce2ec",
                          minHeight: "2rem",
                        }}
                      />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="pb-6">
                    <p
                      className="text-sm font-semibold font-sans leading-none mb-1"
                      style={{
                        color:
                          step.status === "complete"
                            ? "#2d8a5e"
                            : step.status === "pending"
                            ? "#c8991a"
                            : "#8e9ab0",
                      }}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs font-sans leading-relaxed" style={{ color: "#8e9ab0" }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact note */}
            <div
              className="mt-2 rounded-lg px-4 py-3 text-xs font-sans"
              style={{ backgroundColor: "#f7f9fc", color: "#8e9ab0", border: "1px solid #dce2ec" }}
            >
              If you believe this is taking longer than expected, please contact your administrator directly.
            </div>

            {/* Sign out */}
            <div className="mt-6 text-center">
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-xs font-sans hover:underline"
                  style={{ color: "#8e9ab0" }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 mt-6">
          <BethelLogo variant="full" width={160} />
          <p className="text-center text-xs font-sans" style={{ color: "#8e9ab0" }}>
            License No. R4205 &mdash; Windsor Mill, Maryland
          </p>
        </div>
      </div>
    </div>
  );
}
