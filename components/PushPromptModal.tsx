"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

const STORAGE_KEY = "push_prompt_dismissed";

export default function PushPromptModal() {
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Only show once, and only if push is supported + not already granted
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;

    // Show after a short delay so the page loads first
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  async function enablePush() {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { dismiss(); return; }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey || vapidKey === "your_vapid_public_key") { dismiss(); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      dismiss();
    } catch {
      dismiss();
    } finally {
      setSubscribing(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 text-gray-400"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1a2e4a]/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-[#1a2e4a]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Stay informed</p>
            <p className="text-xs text-gray-500 mt-1">
              Enable push notifications to get real-time updates on shifts, payments, and important alerts.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={enablePush}
            disabled={subscribing}
            className="flex-1 bg-[#1a2e4a] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#243d60] transition-colors disabled:opacity-60"
          >
            {subscribing ? "Enabling…" : "Enable notifications"}
          </button>
          <button
            onClick={dismiss}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

