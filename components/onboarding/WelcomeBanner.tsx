"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const DISMISS_KEY = "bethel_welcome_dismissed";

function WelcomeBannerInner({ companyName }: { companyName: string }) {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const showWelcome = searchParams.get("welcome") === "1";
  if (!showWelcome || dismissed) return null;

  return (
    <div className="bg-navy rounded-2xl p-6 flex items-center justify-between mb-4">
      <div className="min-w-0">
        <span className="bg-gold text-navy text-[10px] font-semibold px-2 py-1 rounded-full mb-2 inline-block">
          YOU&apos;RE LIVE
        </span>
        <p className="text-white text-[18px] font-semibold">
          {companyName} is ready to go
        </p>
        <p className="text-white/60 text-[13px]">
          Your branding is set · 1 form sent · 1 license tracked
        </p>
      </div>
      <div className="flex items-center flex-shrink-0">
        <div className="text-right">
          <p className="text-gold text-[20px] font-bold">4/5</p>
          <p className="text-white/60 text-[12px]">Setup complete</p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          className="text-white/40 hover:text-white ml-4 text-[18px] leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function WelcomeBanner({ companyName }: { companyName: string }) {
  return (
    <Suspense fallback={<div />}>
      <WelcomeBannerInner companyName={companyName} />
    </Suspense>
  );
}
