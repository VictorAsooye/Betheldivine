"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Upload,
  Building2,
  Award,
  Heart,
  Stethoscope,
  Loader2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FormSchema } from "@/components/FormRenderer";

const TOTAL_STEPS = 5;

const BRAND_COLORS = [
  { name: "Navy", color: "#0D1B2A" },
  { name: "Gold", color: "#C9A84C" },
  { name: "Slate", color: "#4A5A7A" },
  { name: "Emerald", color: "#059669" },
  { name: "Purple", color: "#7C3AED" },
  { name: "Crimson", color: "#DC2626" },
];

interface LicenseTypeOption {
  key: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  holderType: "organization" | "employee";
}

const LICENSE_TYPES: LicenseTypeOption[] = [
  { key: "Agency Operating License", icon: Building2, title: "Agency Operating License", subtitle: "Organization-level", holderType: "organization" },
  { key: "CNA Certification", icon: Award, title: "CNA Certification", subtitle: "Employee credential", holderType: "employee" },
  { key: "CPR First Aid", icon: Heart, title: "CPR First Aid", subtitle: "Employee credential", holderType: "employee" },
  { key: "HHA Certificate", icon: Stethoscope, title: "HHA Certificate", subtitle: "Employee credential", holderType: "employee" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);

  // Step 1 — company
  const [companyName, setCompanyName] = useState("");
  const [cityState, setCityState] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [tagline, setTagline] = useState("");
  const [brandColor, setBrandColor] = useState("#0D1B2A");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  // Step 2 — invites
  const [emailInput, setEmailInput] = useState("");
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [savingInvites, setSavingInvites] = useState(false);

  // Step 3 — license
  const [licenseType, setLicenseType] = useState<string | null>(null);
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [assignTo, setAssignTo] = useState("organization");
  const [savingLicense, setSavingLicense] = useState(false);

  // Step 4 — form
  const [formPrompt, setFormPrompt] = useState(
    "Monthly visit summary for a home health caregiver — include client name, visit date, services provided, client condition, and caregiver notes."
  );
  const [formTarget, setFormTarget] = useState("employee");
  const [formCategory, setFormCategory] = useState("Clinical");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<FormSchema | null>(null);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);
  const [savedFormName, setSavedFormName] = useState<string>("");
  const [savingForm, setSavingForm] = useState(false);

  // Step 5 — send
  const [sendTo, setSendTo] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentConfirmation, setSentConfirmation] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);

  async function getUserId(): Promise<string | null> {
    if (userIdRef.current) return userIdRef.current;
    const { data } = await supabase.auth.getUser();
    userIdRef.current = data.user?.id ?? null;
    return userIdRef.current;
  }

  async function completeOnboarding() {
    await fetch("/api/onboarding/complete", { method: "POST" });
    router.push("/owner?welcome=1");
  }

  // ── Step 1 ─────────────────────────────────────────────
  function handleLogoSelect(file: File) {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function saveCompany() {
    setSavingCompany(true);
    try {
      const userId = await getUserId();
      let logoPath: string | undefined;
      if (logoFile && userId) {
        const ext = logoFile.name.split(".").pop() ?? "png";
        const path = `${userId}/logo.${ext}`;
        const { error } = await supabase.storage
          .from("branding")
          .upload(path, logoFile, { upsert: true });
        if (!error) logoPath = path;
      }
      await fetch("/api/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          address: cityState,
          email: companyEmail,
          tagline,
          brand_color: brandColor,
          ...(logoPath ? { logo_storage_path: logoPath } : {}),
        }),
      });
      setStep(2);
    } finally {
      setSavingCompany(false);
    }
  }

  // ── Step 2 ─────────────────────────────────────────────
  function addPendingEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setInviteError("Enter a valid email address");
      return;
    }
    if (pendingEmails.includes(email)) {
      setInviteError("That email is already in the list");
      return;
    }
    setPendingEmails((p) => [...p, email]);
    setEmailInput("");
    setInviteError(null);
  }

  function removePendingEmail(email: string) {
    setPendingEmails((p) => p.filter((e) => e !== email));
  }

  async function saveInvites() {
    setSavingInvites(true);
    try {
      if (pendingEmails.length > 0) {
        await fetch("/api/admin/users/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: pendingEmails }),
        });
        setInvitedEmails(pendingEmails);
      }
      setStep(3);
    } finally {
      setSavingInvites(false);
    }
  }

  // ── Step 3 ─────────────────────────────────────────────
  async function saveLicense() {
    if (!licenseType) return;
    setSavingLicense(true);
    try {
      const userId = await getUserId();
      const selected = LICENSE_TYPES.find((l) => l.key === licenseType);
      const holderType = selected?.holderType ?? "organization";
      await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_name: licenseType,
          issuing_authority: issuingAuthority,
          expiry_date: expiryDate,
          holder_type: holderType,
          holder_id: userId,
        }),
      });
      setStep(4);
    } finally {
      setSavingLicense(false);
    }
  }

  // ── Step 4 ─────────────────────────────────────────────
  async function generateForm() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/ai/generate-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: formPrompt,
          target_role: formTarget,
          category: formCategory,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Generation failed");
      setGeneratedSchema(d.schema as FormSchema);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate form");
    } finally {
      setGenerating(false);
    }
  }

  async function saveForm() {
    if (!generatedSchema) return;
    setSavingForm(true);
    try {
      const res = await fetch("/api/forms/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: generatedSchema.title ?? "Untitled form",
          description: generatedSchema.description ?? null,
          schema: generatedSchema,
          target_role: formTarget,
        }),
      });
      const d = await res.json();
      if (res.ok && d?.id) {
        setSavedFormId(d.id as string);
        setSavedFormName((generatedSchema.title as string) ?? "Untitled form");
        setSendTo(invitedEmails[0] ?? "");
        setStep(5);
      }
    } finally {
      setSavingForm(false);
    }
  }

  // ── Step 5 ─────────────────────────────────────────────
  async function sendForm() {
    if (!savedFormId) return;
    setSending(true);
    setSendError(null);
    try {
      // Try to resolve the recipient to an employee profile id.
      let employeeIds: string[] = [];
      const recipient = sendTo.trim().toLowerCase();
      if (recipient) {
        const empRes = await fetch("/api/employees");
        if (empRes.ok) {
          const employees = (await empRes.json()) as Array<{
            profile_id: string;
            profiles?: { email?: string } | null;
          }>;
          const match = employees.find(
            (e) => e.profiles?.email?.toLowerCase() === recipient
          );
          if (match) employeeIds = [match.profile_id];
        }
      }

      if (employeeIds.length === 0) {
        // Recipient is not yet an active employee (e.g. still pending invite).
        setSentConfirmation("Invite sent — they'll see the form when they join.");
        return;
      }

      const res = await fetch(`/api/forms/${savedFormId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: savedFormId, employeeIds }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Send failed");
      setSentConfirmation("Form sent successfully!");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send form");
    } finally {
      setSending(false);
    }
  }

  // ── Continue button gating ─────────────────────────────
  const canContinue = (() => {
    if (step === 1) return companyName.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return !!licenseType && !!expiryDate;
    if (step === 4) return !!generatedSchema;
    return true;
  })();

  async function handleContinue() {
    if (step === 1) return saveCompany();
    if (step === 2) return saveInvites();
    if (step === 3) return saveLicense();
    if (step === 4) return saveForm();
  }

  const continueBusy =
    savingCompany || savingInvites || savingLicense || savingForm;

  const progressPct = (step / TOTAL_STEPS) * 100;

  const displayCompany = companyName.trim() || "Bethel Divine";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Custom top bar */}
      <header className="bg-paper border-b border-line h-14 flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="text-navy font-semibold text-[15px]">Sola Support</span>
        </div>
        <button
          onClick={completeOnboarding}
          className="text-muted text-[13px] hover:text-ink"
        >
          Skip setup →
        </button>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-line w-full flex-shrink-0">
        <div
          className="h-full bg-gold transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 py-3 flex-shrink-0">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          const n = i + 1;
          const done = n <= step;
          return (
            <span
              key={n}
              className={`w-2.5 h-2.5 rounded-full ${
                done ? "bg-gold" : "border border-line2 bg-transparent"
              }`}
            />
          );
        })}
      </div>

      {/* Step content */}
      <main className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-lg mx-auto px-4 pt-12">
          {step === 1 && (
            <Step1
              companyName={companyName}
              setCompanyName={setCompanyName}
              cityState={cityState}
              setCityState={setCityState}
              companyEmail={companyEmail}
              setCompanyEmail={setCompanyEmail}
              tagline={tagline}
              setTagline={setTagline}
              brandColor={brandColor}
              setBrandColor={setBrandColor}
              logoPreview={logoPreview}
              logoInputRef={logoInputRef}
              onLogoSelect={handleLogoSelect}
            />
          )}

          {step === 2 && (
            <Step2
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              pendingEmails={pendingEmails}
              addPendingEmail={addPendingEmail}
              removePendingEmail={removePendingEmail}
              inviteError={inviteError}
              onSkip={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <Step3
              licenseType={licenseType}
              setLicenseType={setLicenseType}
              issuingAuthority={issuingAuthority}
              setIssuingAuthority={setIssuingAuthority}
              expiryDate={expiryDate}
              setExpiryDate={setExpiryDate}
              assignTo={assignTo}
              setAssignTo={setAssignTo}
              invitedEmails={invitedEmails}
            />
          )}

          {step === 4 && (
            <Step4
              formPrompt={formPrompt}
              setFormPrompt={setFormPrompt}
              formTarget={formTarget}
              setFormTarget={setFormTarget}
              formCategory={formCategory}
              setFormCategory={setFormCategory}
              generating={generating}
              genError={genError}
              generatedSchema={generatedSchema}
              onGenerate={generateForm}
              companyName={displayCompany}
            />
          )}

          {step === 5 && (
            <Step5
              sendTo={sendTo}
              setSendTo={setSendTo}
              formName={savedFormName}
              companyName={displayCompany}
              sending={sending}
              sendError={sendError}
              sentConfirmation={sentConfirmation}
              onSend={sendForm}
              onGoToDashboard={completeOnboarding}
            />
          )}
        </div>
      </main>

      {/* Footer navigation */}
      {step < 5 ? (
        <footer className="bg-paper border-t border-line px-6 py-4 flex items-center justify-between flex-shrink-0">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-muted text-[13px]"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={handleContinue}
            disabled={!canContinue || continueBusy}
            className="bg-navy text-white px-6 py-2.5 rounded-lg font-medium text-[13px] disabled:opacity-50 flex items-center gap-2"
          >
            {continueBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            Continue →
          </button>
        </footer>
      ) : (
        <footer className="bg-paper border-t border-line px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setStep(4)} className="text-muted text-[13px]">
            ← Back
          </button>
          <button
            onClick={completeOnboarding}
            className="text-muted text-[13px] underline"
          >
            Skip for now
          </button>
        </footer>
      )}
    </div>
  );
}

/* ── Step 1 ─────────────────────────────────────────── */
function Step1(props: {
  companyName: string;
  setCompanyName: (v: string) => void;
  cityState: string;
  setCityState: (v: string) => void;
  companyEmail: string;
  setCompanyEmail: (v: string) => void;
  tagline: string;
  setTagline: (v: string) => void;
  brandColor: string;
  setBrandColor: (v: string) => void;
  logoPreview: string | null;
  logoInputRef: React.RefObject<HTMLInputElement>;
  onLogoSelect: (f: File) => void;
}) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold text-ink">Set up your company</h1>
      <p className="text-muted text-[14px]">
        This will appear on your forms and employee portal.
      </p>

      <div className="bg-paper border border-line2 rounded-xl p-6 space-y-4 mt-6">
        <Field label="Company name" required>
          <input
            value={props.companyName}
            onChange={(e) => props.setCompanyName(e.target.value)}
            className="onb-input"
          />
        </Field>
        <Field label="City / State">
          <input
            value={props.cityState}
            onChange={(e) => props.setCityState(e.target.value)}
            className="onb-input"
          />
        </Field>
        <Field label="Company email">
          <input
            type="email"
            value={props.companyEmail}
            onChange={(e) => props.setCompanyEmail(e.target.value)}
            className="onb-input"
          />
        </Field>
        <Field label="Tagline">
          <input
            value={props.tagline}
            onChange={(e) => props.setTagline(e.target.value)}
            placeholder="What does your company do in one line?"
            className="onb-input"
          />
        </Field>

        <Field label="Logo">
          <div
            onClick={() => props.logoInputRef.current?.click()}
            className="bg-paper2 border-2 border-dashed border-line2 rounded-xl p-6 text-center cursor-pointer"
          >
            {props.logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={props.logoPreview}
                alt="Logo preview"
                className="w-16 h-16 rounded-lg object-contain mx-auto border border-line2 bg-paper"
              />
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted mx-auto mb-2" />
                <p className="text-[13px] text-muted">Click to upload your logo</p>
              </>
            )}
          </div>
          <input
            ref={props.logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) props.onLogoSelect(f);
            }}
          />
        </Field>

        <Field label="Brand color">
          <div className="flex flex-wrap gap-3">
            {BRAND_COLORS.map((p) => (
              <button
                key={p.color}
                type="button"
                onClick={() => props.setBrandColor(p.color)}
                title={p.name}
                className={`w-10 h-10 rounded-full ${
                  props.brandColor === p.color ? "ring-2 ring-navy ring-offset-2" : ""
                }`}
                style={{ backgroundColor: p.color }}
              />
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

/* ── Step 2 ─────────────────────────────────────────── */
function Step2(props: {
  emailInput: string;
  setEmailInput: (v: string) => void;
  pendingEmails: string[];
  addPendingEmail: () => void;
  removePendingEmail: (e: string) => void;
  inviteError: string | null;
  onSkip: () => void;
}) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold text-ink">Invite your team</h1>
      <p className="text-muted text-[14px]">
        Add team members who need access to the portal.
      </p>

      <div className="bg-paper border border-line2 rounded-xl p-6 mt-6">
        <div className="flex gap-2">
          <input
            type="email"
            value={props.emailInput}
            onChange={(e) => props.setEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                props.addPendingEmail();
              }
            }}
            placeholder="teammate@example.com"
            className="onb-input flex-1"
          />
          <button
            onClick={props.addPendingEmail}
            className="bg-navy text-white px-4 py-2 rounded-lg text-[13px] font-medium flex-shrink-0"
          >
            Invite
          </button>
        </div>
        {props.inviteError && (
          <p className="text-[12px] text-danger-text mt-2">{props.inviteError}</p>
        )}

        {props.pendingEmails.length > 0 && (
          <div className="space-y-2 mt-4">
            {props.pendingEmails.map((email) => (
              <div
                key={email}
                className="flex items-center gap-2 bg-paper2 rounded-lg px-3 py-2"
              >
                <span className="text-[13px] text-ink2 flex-1 truncate">{email}</span>
                <span className="bg-paper text-muted text-[10px] px-2 py-0.5 rounded-full">
                  Pending
                </span>
                <button
                  onClick={() => props.removePendingEmail(email)}
                  className="text-muted hover:text-ink text-[14px] leading-none px-1"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={props.onSkip}
        className="text-muted text-[13px] underline cursor-pointer mt-3"
      >
        Skip this step
      </button>
    </div>
  );
}

/* ── Step 3 ─────────────────────────────────────────── */
function Step3(props: {
  licenseType: string | null;
  setLicenseType: (v: string) => void;
  issuingAuthority: string;
  setIssuingAuthority: (v: string) => void;
  expiryDate: string;
  setExpiryDate: (v: string) => void;
  assignTo: string;
  setAssignTo: (v: string) => void;
  invitedEmails: string[];
}) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold text-ink">Track your first license</h1>
      <p className="text-muted text-[14px]">
        We&apos;ll send you alerts before it expires.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {LICENSE_TYPES.map((lt) => {
          const Icon = lt.icon;
          const selected = props.licenseType === lt.key;
          return (
            <button
              key={lt.key}
              type="button"
              onClick={() => props.setLicenseType(lt.key)}
              className={`bg-paper border-2 rounded-xl p-4 cursor-pointer hover:border-navy transition-colors text-left ${
                selected ? "border-navy bg-navy/5" : "border-line2"
              }`}
            >
              <Icon className="w-5 h-5 text-slate mb-2" />
              <p className="text-[14px] font-medium text-ink">{lt.title}</p>
              <p className="text-[12px] text-muted">{lt.subtitle}</p>
            </button>
          );
        })}
      </div>

      {props.licenseType && (
        <div className="bg-paper border border-line2 rounded-xl p-6 mt-4 space-y-4">
          <Field label="Issuing authority">
            <input
              value={props.issuingAuthority}
              onChange={(e) => props.setIssuingAuthority(e.target.value)}
              className="onb-input"
            />
          </Field>
          <Field label="Expiry date">
            <input
              type="date"
              value={props.expiryDate}
              onChange={(e) => props.setExpiryDate(e.target.value)}
              className="onb-input border-warning-border"
            />
          </Field>
          <Field label="Assign to">
            <select
              value={props.assignTo}
              onChange={(e) => props.setAssignTo(e.target.value)}
              className="onb-input"
            >
              <option value="organization">Organization</option>
              {props.invitedEmails.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

/* ── Step 4 ─────────────────────────────────────────── */
function Step4(props: {
  formPrompt: string;
  setFormPrompt: (v: string) => void;
  formTarget: string;
  setFormTarget: (v: string) => void;
  formCategory: string;
  setFormCategory: (v: string) => void;
  generating: boolean;
  genError: string | null;
  generatedSchema: FormSchema | null;
  onGenerate: () => void;
  companyName: string;
}) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold text-ink">
        Create your first form with Sola AI
      </h1>
      <p className="text-muted text-[14px]">
        Describe it in plain English — Sola builds it in seconds.
      </p>

      <div className="bg-paper border border-line2 rounded-xl p-6 mt-6 space-y-3">
        <textarea
          value={props.formPrompt}
          onChange={(e) => props.setFormPrompt(e.target.value)}
          className="w-full bg-paper2 border border-line2 rounded-lg p-3 text-[13px] text-ink min-h-[90px] outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={props.formTarget}
            onChange={(e) => props.setFormTarget(e.target.value)}
            className="onb-input w-auto"
          >
            <option value="employee">Employee</option>
            <option value="client">Client</option>
            <option value="all">All</option>
          </select>
          <select
            value={props.formCategory}
            onChange={(e) => props.setFormCategory(e.target.value)}
            className="onb-input w-auto"
          >
            {["Intake", "Compliance", "Clinical", "Administrative", "Other"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {props.genError && (
          <p className="text-[12px] text-danger-text">{props.genError}</p>
        )}
        <button
          onClick={props.onGenerate}
          disabled={props.generating || !props.formPrompt.trim()}
          className="bg-slate text-white rounded-lg px-4 py-2.5 font-medium text-[13px] disabled:opacity-50 flex items-center gap-2"
        >
          {props.generating && <Loader2 className="w-4 h-4 animate-spin" />}
          {props.generating ? "Generating…" : "Generate my form"}
        </button>
      </div>

      {props.generatedSchema && (
        <FormPreview schema={props.generatedSchema} companyName={props.companyName} />
      )}
    </div>
  );
}

function FormPreview({
  schema,
  companyName,
}: {
  schema: FormSchema;
  companyName: string;
}) {
  const fields = schema.fields ?? [];
  return (
    <div className="mt-5 rounded-xl overflow-hidden border border-line2">
      {/* Navy header */}
      <div className="bg-navy px-5 py-4 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center flex-shrink-0"
          style={{ fontFamily: "Georgia, serif" }}
        >
          <span className="text-navy font-bold">B</span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-medium text-[14px] truncate">{companyName}</p>
          <p className="text-white/60 text-[12px]">Sola Portal</p>
        </div>
      </div>
      {/* Gold title bar */}
      <div className="bg-gold px-5 py-2">
        <p className="text-navy text-[14px] font-semibold">{schema.title}</p>
      </div>
      {/* Field renderer (simple) */}
      <div className="bg-paper p-5 space-y-3">
        {fields.map((f) => {
          if (f.type === "section") {
            return (
              <p
                key={f.id}
                className="text-[12px] uppercase tracking-wide text-muted font-medium pt-2"
              >
                {f.label}
              </p>
            );
          }
          return (
            <div key={f.id}>
              <label className="block text-[12px] font-medium text-ink2 mb-1">
                {f.label}
                {f.required && <span className="text-danger-text"> *</span>}
              </label>
              <div className="w-full bg-paper2 border border-line2 rounded-lg px-3 py-2 text-[13px] text-muted">
                {f.placeholder || `Enter ${f.label.toLowerCase()}`}
              </div>
            </div>
          );
        })}
      </div>
      {/* Footer */}
      <div className="bg-paper border-t border-line px-5 py-3 flex items-center justify-between text-[11px] text-muted">
        <span>{companyName}</span>
        <span>Powered by Sola</span>
      </div>
    </div>
  );
}

/* ── Step 5 ─────────────────────────────────────────── */
function Step5(props: {
  sendTo: string;
  setSendTo: (v: string) => void;
  formName: string;
  companyName: string;
  sending: boolean;
  sendError: string | null;
  sentConfirmation: string | null;
  onSend: () => void;
  onGoToDashboard: () => void;
}) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold text-ink">Send your first form</h1>
      <p className="text-muted text-[14px]">
        Get a response from your team right away.
      </p>

      <div className="bg-paper border border-line2 rounded-xl p-6 mt-6 space-y-4">
        <Field label="To">
          <input
            type="email"
            value={props.sendTo}
            onChange={(e) => props.setSendTo(e.target.value)}
            placeholder="teammate@example.com"
            className="onb-input"
          />
        </Field>
        <Field label="Form">
          <input
            readOnly
            value={props.formName}
            className="onb-input bg-paper2 cursor-not-allowed text-muted"
          />
        </Field>
        <Field label="From">
          <input
            readOnly
            value={props.companyName}
            className="onb-input bg-paper2 cursor-not-allowed text-muted"
          />
        </Field>

        {props.sendError && (
          <p className="text-[12px] text-danger-text">{props.sendError}</p>
        )}

        {!props.sentConfirmation ? (
          <button
            onClick={props.onSend}
            disabled={props.sending}
            className="bg-gold text-navy font-semibold rounded-lg px-6 py-2.5 text-[13px] disabled:opacity-50 flex items-center gap-2"
          >
            {props.sending && <Loader2 className="w-4 h-4 animate-spin" />}
            Send form
          </button>
        ) : (
          <>
            <div className="bg-success-bg border border-success-border rounded-lg px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success-text flex-shrink-0" />
              <p className="text-[13px] text-success-text">{props.sentConfirmation}</p>
            </div>
            <button
              onClick={props.onGoToDashboard}
              className="bg-navy text-white rounded-lg px-6 py-2.5 text-[13px] font-medium"
            >
              Go to dashboard →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Shared field wrapper ───────────────────────────── */
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-ink2 mb-1">
        {label}
        {required && <span className="text-danger-text"> *</span>}
      </label>
      {children}
    </div>
  );
}
