import { NextRequest, NextResponse } from "next/server";
import { submitEVV } from "@/lib/evv";

// Internal HTTP endpoint for manual EVV re-submission
// Protected by x-internal-key = SUPABASE_SERVICE_ROLE_KEY
export async function POST(request: NextRequest) {
  const internalKey = request.headers.get("x-internal-key");
  if (internalKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { shift_id } = await request.json();
  if (!shift_id) {
    return NextResponse.json({ error: "shift_id is required" }, { status: 400 });
  }

  await submitEVV(shift_id);
  return NextResponse.json({ success: true });
}
