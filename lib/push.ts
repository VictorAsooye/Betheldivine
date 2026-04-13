// Web Push utility
// Generate VAPID keys with: npx web-push generate-vapid-keys
// Then add to .env.local:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
//   VAPID_PRIVATE_KEY=...
//   VAPID_EMAIL=mailto:victor@betheldivine.com

import { createClient as createServiceClient } from "@supabase/supabase-js";

function getWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (!pub || pub === "your_vapid_public_key" || !priv || priv === "your_vapid_private_key") {
    return null;
  }
  return { pub, priv, email: email ?? "mailto:admin@betheldivine.com" };
}

export async function sendPushToUser(
  userId: string,
  title: string,
  message: string,
  url?: string
): Promise<void> {
  const vapid = getWebPush();
  if (!vapid) {
    console.log(`[Push] VAPID not configured. Would push to user ${userId}: ${title}`);
    return;
  }

  // Dynamic import to avoid issues in environments without native modules
  const webpush = await import("web-push");
  webpush.setVapidDetails(vapid.email, vapid.pub, vapid.priv);

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subs } = await service
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({ title, message, url: url ?? "/" });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch((err: unknown) => {
        // Remove stale subscriptions (410 Gone)
        if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
          void service.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      })
    )
  );
}
