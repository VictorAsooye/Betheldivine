"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

const INDUSTRIES = ["Home Health", "Assisted Living", "Hospice", "Adult Day Care", "Other"];
const TEAM_SIZES = ["Just me", "2–10 people", "11–50 people", "51–200 people", "200+ people"];
const TIMELINES = ["Right away", "In the next month", "Just exploring for now"];

const PAIN_POINTS = [
  "Filling out paperwork by hand",
  "Tracking licenses and certifications",
  "Creating and updating care plans",
  "Getting signatures from staff or clients",
  "Keeping documents organized",
  "Something else",
];

const BRAND_COLORS = [
  { name: "Navy", color: "#0D1B2A" },
  { name: "Gold", color: "#C9A84C" },
  { name: "Slate", color: "#4A5A7A" },
  { name: "Emerald", color: "#059669" },
  { name: "Purple", color: "#7C3AED" },
  { name: "Crimson", color: "#DC2626" },
];

export default function DemoIntakePage() {
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [cityState, setCityState] = useState("");
  const [teamSize, setTeamSize] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [painPointDetails, setPainPointDetails] = useState("");
  const [sampleFormDescription, setSampleFormDescription] = useState("");

  const [brandColor, setBrandColor] = useState("");
  const [tagline, setTagline] = useState("");
  const [timeline, setTimeline] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function togglePainPoint(p: string) {
    setPainPoints((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/demo-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          industry,
          city_state: cityState,
          team_size: teamSize,
          contact_name: contactName,
          contact_role: contactRole,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          pain_points: painPoints,
          pain_point_details: painPointDetails,
          sample_form_description: sampleFormDescription,
          brand_color: brandColor,
          tagline,
          timeline,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Something went wrong. Please try again.");
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-paper2 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-paper border border-line2 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-success-text mx-auto mb-4" />
          <h1 className="text-[24px] text-ink mb-2" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
            Thanks — you&apos;re all set
          </h1>
          <p className="text-[15px] text-muted">
            We got your answers. Someone from our team will reach out soon with a demo built just for {companyName || "your company"}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper2">
      <header className="bg-navy py-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full border-2 border-gold flex items-center justify-center mx-auto mb-4">
            <span className="text-gold font-bold text-[20px]" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>S</span>
          </div>
          <h1 className="text-[32px] text-white mb-2" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
            Let&apos;s build your demo
          </h1>
          <p className="text-[16px] text-white/70 max-w-lg mx-auto">
            Answer a few quick questions and we&apos;ll put together a working demo of Sola, made for your company.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <Section title="Your company">
          <Field label="Company name" required>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="di-input"
            />
          </Field>
          <Field label="What kind of care do you provide?">
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="di-input">
              <option value="">Choose one</option>
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City, State">
              <input value={cityState} onChange={(e) => setCityState(e.target.value)} className="di-input" />
            </Field>
            <Field label="About how many people work there?">
              <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="di-input">
                <option value="">Choose one</option>
                {TEAM_SIZES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="How to reach you">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Your name" required>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} required className="di-input" />
            </Field>
            <Field label="Your role">
              <input
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder="e.g. Owner, Office Manager"
                className="di-input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" required>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required className="di-input" />
            </Field>
            <Field label="Phone">
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="di-input" />
            </Field>
          </div>
        </Section>

        <Section title="What's slowing you down today?" subtitle="Pick everything that applies.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PAIN_POINTS.map((p) => {
              const selected = painPoints.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePainPoint(p)}
                  className={`text-left px-4 py-3 rounded-xl border-2 text-[14px] transition-colors ${
                    selected ? "border-navy bg-navy/5 text-ink font-medium" : "border-line2 text-ink2"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <Field label="Tell us more (optional)">
            <textarea
              value={painPointDetails}
              onChange={(e) => setPainPointDetails(e.target.value)}
              placeholder="What takes the most time in a normal week?"
              rows={3}
              className="di-input resize-none"
            />
          </Field>
        </Section>

        <Section title="Show us an example" subtitle="This helps us prepare a demo using a real form your team already uses.">
          <Field label="Describe one form or piece of paperwork your team fills out today">
            <textarea
              value={sampleFormDescription}
              onChange={(e) => setSampleFormDescription(e.target.value)}
              placeholder="e.g. A one-page intake form we fill out by hand for every new client"
              rows={3}
              className="di-input resize-none"
            />
          </Field>
        </Section>

        <Section title="Look and feel" subtitle="Optional — helps your demo feel like your company from day one.">
          <Field label="Pick a color">
            <div className="flex flex-wrap gap-3">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setBrandColor(c.color)}
                  title={c.name}
                  className={`w-10 h-10 rounded-full ${brandColor === c.color ? "ring-2 ring-navy ring-offset-2" : ""}`}
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </div>
          </Field>
          <Field label="Your tagline">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="What's one line that describes your company?"
              className="di-input"
            />
          </Field>
        </Section>

        <Section title="Timeline">
          <Field label="When would you like to get started?">
            <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className="di-input">
              <option value="">Choose one</option>
              {TIMELINES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </Section>

        {error && <p className="text-[14px] text-danger-text">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-navy text-white text-[16px] font-medium py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {submitting ? "Sending…" : "Send it to Sola"}
        </button>
      </form>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-paper border border-line2 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-[19px] text-ink" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>{title}</h2>
        {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

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
      <label className="block text-[13px] font-medium text-ink2 mb-1.5">
        {label}
        {required && <span className="text-danger-text"> *</span>}
      </label>
      {children}
    </div>
  );
}
