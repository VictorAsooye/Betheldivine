import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

// POST /api/push/send — admin/owner only; send push to a specific user
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, title, message, url } = body as {
    userId: string;
    title: string;
    message: string;
    url?: string;
  };

  if (!userId || !title || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await sendPushToUser(userId, title, message, url);
  return NextResponse.json({ ok: true });
}
