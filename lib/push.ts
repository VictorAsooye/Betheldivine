// Web Push utility — web-push package removed; push notifications are disabled.
// This file is kept as a stub so lib/notifications/create.ts compiles without changes.

export async function sendPushToUser(
  userId: string,
  title: string,
  message: string,
  url?: string
): Promise<void> {
  // Push notifications are not configured in this deployment.
  console.log(`[Push] Disabled. Would push to user ${userId}: ${title} — ${message}${url ? ` (${url})` : ""}`);
}
