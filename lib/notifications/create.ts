import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/push";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  push?: boolean; // whether to also send web push
}

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link,
  push = false,
}: CreateNotificationInput): Promise<void> {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Insert in-app notification
  await service.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    link: link ?? null,
  });

  // Optionally send web push alongside
  if (push) {
    sendPushToUser(userId, title, message, link).catch(() => {});
  }
}
