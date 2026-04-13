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
        className="hidden lg:flex lg:w-1/2 flex-col justify-between px-12 py-14"
        style={{ backgroundColor: "#122038" }}
      >
        <div>
          <div className="mb-10">
            <BethelLogo variant="full" width={220} />
          </div>
          <p
            className="mt-2 text-lg leading-relaxed italic"
            style={{ color: "#8e9ab0", fontFamily: "var(--font-lora), Georgia, serif" }}
          >
            &ldquo;Serving You Is What We Do Best&rdquo;
          </p>
          <p
            className="mt-4 text-sm font-sans font-semibold tracking-widest uppercase"
            style={{ color: "#c8991a", opacity: 0.85 }}
          >
            Internal Portal
          </p>
        </div>

        <div className="space-y-3">
          <div
            className="h-px w-16"
            style={{ backgroundColor: "#c8991a", opacity: 0.4 }}
          />
          <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>
            Licensed Home Health Agency
          </p>
          <p className="text-xs font-sans font-semibold" style={{ color: "#8e9ab0" }}>
            License No. R4205
          </p>
          <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>
            Windsor Mill, Maryland
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
