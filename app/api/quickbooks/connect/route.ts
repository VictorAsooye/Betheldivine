import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/quickbooks";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const state = randomUUID();
  const authUrl = buildAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  // Store state in a short-lived cookie for CSRF verification
  response.cookies.set("qb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
    sameSite: "lax",
  });

  return response;
}
