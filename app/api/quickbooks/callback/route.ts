import { createClient as createServiceClient } from "@supabase/supabase-js";
import { exchangeCodeForTokens } from "@/lib/quickbooks";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const storedState = request.cookies.get("qb_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/settings?qb_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !realmId || !state || state !== storedState) {
    return NextResponse.redirect(
      new URL("/admin/settings?qb_error=invalid_state", request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code, realmId);
    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upsert tokens (one row per realm_id)
    const { error: dbError } = await service
      .from("quickbooks_tokens")
      .upsert(
        {
          realm_id: realmId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: expiry,
        },
        { onConflict: "realm_id" }
      );

    if (dbError) {
      console.error("QB token storage error:", dbError.message);
      return NextResponse.redirect(
        new URL("/admin/settings?qb_error=db_error", request.url)
      );
    }

    const response = NextResponse.redirect(
      new URL("/admin/settings?qb_connected=1", request.url)
    );
    response.cookies.delete("qb_oauth_state");
    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("QB callback error:", msg);
    return NextResponse.redirect(
      new URL(`/admin/settings?qb_error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}
