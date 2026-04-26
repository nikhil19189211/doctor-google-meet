import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasCode } from "@/lib/consult-codes";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { code, userId, userName } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Session code is required" }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase().trim();
    const safeUserId = (userId as string) || `patient-${Date.now()}`;
    void userName;
    void safeUserId;

    // Fast path: in-memory store
    if (hasCode(normalizedCode)) {
      return NextResponse.json({ roomId: normalizedCode });
    }

    // Fallback: DB lookup
    const { data: meeting } = await supabaseAdmin
      .from("doctor_meetings")
      .select("code, expires_at")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .maybeSingle();

    if (!meeting) {
      return NextResponse.json(
        { error: "Invalid or expired session code. Please check the code and try again." },
        { status: 404 }
      );
    }

    if (new Date(meeting.expires_at) < new Date()) {
      return NextResponse.json({ error: "Session code has expired." }, { status: 404 });
    }

    return NextResponse.json({ roomId: normalizedCode });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
