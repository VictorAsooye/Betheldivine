"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BethelLogo from "@/components/BethelLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Brand Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col"
        style={{
          backgroundColor: "#0d1b32",
          padding: "36px 32px",
          justifyContent: "space-between",
        }}
      >
        {/* Top section */}
        <div>
          <p
            className="font-sans"
            style={{
              color: "#c8991a",
              fontSize: "11px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            Internal Portal
          </p>
          <h1
            style={{
              fontFamily: "var(--font-lora), Georgia, serif",
              fontSize: "52px",
              color: "#ffffff",
              lineHeight: 1.1,
              fontWeight: 400,
              marginBottom: "6px",
            }}
          >
            Bethel-<br />Divine
          </h1>
          <p
            className="font-sans"
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "12px",
              letterSpacing: "0.5px",
              marginBottom: "14px",
            }}
          >
            Health Care Services, LLC
          </p>
          <div
            style={{
              width: "28px",
              height: "2px",
              backgroundColor: "#c8991a",
              marginBottom: "14px",
            }}
          />
          <p
            className="font-sans"
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "12px",
              fontStyle: "italic",
              lineHeight: 1.7,
            }}
          >
            &ldquo;Bringing Professional,<br />Medical Care Closer to You&rdquo;
          </p>
        </div>

        {/* Bottom section — contact card */}
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "6px",
            padding: "14px 16px",
          }}
        >
          <p
            className="font-sans"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "10px",
            }}
          >
            Contact &amp; Info
          </p>
          <p className="font-sans" style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginBottom: "5px" }}>
            443-822-2012
          </p>
          <p className="font-sans" style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginBottom: "5px" }}>
            Pikesville, MD 21215
          </p>
          <p className="font-sans" style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginBottom: "5px" }}>
            Mon–Fri: 9:00am – 5:00pm
          </p>
          <div style={{ width: "100%", height: "1px", backgroundColor: "rgba(255,255,255,0.08)", margin: "10px 0" }} />
          <p className="font-sans" style={{ color: "#c8991a", fontSize: "11px", fontWeight: 500 }}>
            License No. R4205
          </p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-off-white px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="lg:hidden mb-10 flex flex-col items-center gap-3">
            <BethelLogo variant="icon" width={56} />
            <h1
              className="text-2xl font-bold text-center"
              style={{
                color: "#122038",
                fontFamily: "var(--font-lora), Georgia, serif",
              }}
            >
              Bethel Divine Healthcare
            </h1>
            <p className="text-sm italic" style={{ color: "#8e9ab0" }}>
              Serving You Is What We Do Best
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border px-8 py-10" style={{ borderColor: "#dce2ec" }}>
            <h2
              className="text-2xl font-bold mb-1"
              style={{
                color: "#1a2e4a",
                fontFamily: "var(--font-lora), Georgia, serif",
              }}
            >
              Welcome back
            </h2>
            <p className="text-sm mb-8 font-sans" style={{ color: "#8e9ab0" }}>
              Sign in to access your dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold mb-1.5 font-sans"
                  style={{ color: "#1a2e4a" }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@betheldivine.com"
                  className="w-full px-4 py-3 rounded-lg border text-sm font-sans outline-none transition-all"
                  style={{
                    borderColor: "#dce2ec",
                    color: "#1a2e4a",
                    backgroundColor: "#f7f9fc",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#c8991a")}
                  onBlur={(e) => (e.target.style.borderColor = "#dce2ec")}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold mb-1.5 font-sans"
                  style={{ color: "#1a2e4a" }}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border text-sm font-sans outline-none transition-all"
                  style={{
                    borderColor: "#dce2ec",
                    color: "#1a2e4a",
                    backgroundColor: "#f7f9fc",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#c8991a")}
                  onBlur={(e) => (e.target.style.borderColor = "#dce2ec")}
                />
              </div>

              {error && (
                <div
                  className="text-sm font-sans px-4 py-3 rounded-lg"
                  style={{ backgroundColor: "#fef2f2", color: "#c0392b", border: "1px solid #fca5a5" }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white text-sm font-semibold font-sans transition-all disabled:opacity-60"
                style={{ backgroundColor: loading ? "#223a5e" : "#1a2e4a" }}
                onMouseEnter={(e) => {
                  if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = "#122038";
                }}
                onMouseLeave={(e) => {
                  if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = "#1a2e4a";
                }}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm mt-6 font-sans" style={{ color: "#8e9ab0" }}>
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold hover:underline"
                style={{ color: "#c8991a" }}
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
