import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { licenseExpiryTemplate, licenseExpiredTemplate } from "@/lib/email/templates";

function calcStatus(expiryDate: string): "active" | "expiring_soon" | "expired" {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysOut = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysOut < 0) return "expired";
  if (daysOut <= 60) return "expiring_soon";
  return "active";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Recalculate statuses on every read for accuracy
  await supabase.rpc("recalculate_license_statuses");

  let query = supabase
    .from("licenses")
    .select(`
      id, holder_id, holder_type, license_name, license_number,
      issuing_authority, issued_date, expiry_date, status,
      document_url, notes, created_at,
      profiles!licenses_holder_id_fkey(full_name, email)
    `)
    .order("expiry_date", { ascending: true });

  // Employees only see their own
  if (profile?.role === "employee") {
    query = query.eq("holder_id", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const {
    holder_id, holder_type, license_name, license_number,
    issuing_authority, issued_date, expiry_date, document_url, notes,
  } = body;

  if (!holder_id || !license_name || !expiry_date) {
    return NextResponse.json({ error: "holder_id, license_name, and expiry_date are required" }, { status: 400 });
  }

  const expiryParsed = new Date(expiry_date);
  if (isNaN(expiryParsed.getTime())) {
    return NextResponse.json({ error: "Invalid expiry date format" }, { status: 400 });
  }

  const status = calcStatus(expiry_date);

  const { data, error } = await supabase
    .from("licenses")
    .insert({
      holder_id,
      holder_type: holder_type ?? "employee",
      license_name,
      license_number: license_number ?? "",
      issuing_authority: issuing_authority ?? "",
      issued_date: issued_date ?? null,
      expiry_date,
      status,
      document_url: document_url ?? null,
      notes: notes ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch holder profile for email
  const { data: holderProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", holder_id)
    .single();

  await checkAndSendNotifications(
    supabase,
    data.id,
    license_name,
    expiry_date,
    holder_id,
    holderProfile?.full_name ?? "Employee",
    holderProfile?.email ?? null
  );

  return NextResponse.json(data, { status: 201 });
}

async function checkAndSendNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  licenseId: string,
  licenseName: string,
  expiryDate: string,
  holderId: string,
  holderName: string,
  holderEmail: string | null
) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysOut = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://betheldivine.com";
  const licenseUrl = `${baseUrl}/employee/licenses`;

  const thresholds: Array<{ days: number; type: string }> = [
    { days: 90, type: "90_days" },
    { days: 60, type: "60_days" },
    { days: 30, type: "30_days" },
    { days: 14, type: "14_days" },
  ];

  for (const t of thresholds) {
    if (daysOut <= t.days) {
      const { data: existing } = await supabase
        .from("license_notifications")
        .select("id")
        .eq("license_id", licenseId)
        .eq("notify_user_id", holderId)
        .eq("notification_type", t.type)
        .maybeSingle();

      if (!existing) {
        await supabase.from("license_notifications").insert({
          license_id: licenseId,
          notify_user_id: holderId,
          notification_type: t.type,
        });

        if (holderEmail) {
          const tpl = licenseExpiryTemplate({
            name: holderName,
            licenseName,
            expiryDate,
            daysRemaining: Math.max(0, daysOut),
            licenseUrl,
          });
          sendEmail({ to: holderEmail, subject: tpl.subject, html: tpl.html }).catch(() => {});
        }
      }
    }
  }

  if (daysOut < 0) {
    const { data: existing } = await supabase
      .from("license_notifications")
      .select("id")
      .eq("license_id", licenseId)
      .eq("notify_user_id", holderId)
      .eq("notification_type", "expired")
      .maybeSingle();

    if (!existing) {
      await supabase.from("license_notifications").insert({
        license_id: licenseId,
        notify_user_id: holderId,
        notification_type: "expired",
      });

      if (holderEmail) {
        const tpl = licenseExpiredTemplate({
          name: holderName,
          licenseName,
          expiryDate,
          licenseUrl,
        });
        sendEmail({ to: holderEmail, subject: tpl.subject, html: tpl.html }).catch(() => {});
      }
    }
  }
}
