import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from "jsonwebtoken";

function makeDoctorToken(): string {
  const apiKey = process.env.VIDEOSDK_API_KEY;
  const secret = process.env.VIDEOSDK_SECRET_KEY;
  if (!apiKey || !secret) throw new Error("VideoSDK credentials not configured");
  return jwt.sign(
    { apikey: apiKey, permissions: ["allow_join", "allow_mod"], version: 2, roles: [] },
    secret,
    { algorithm: "HS256", expiresIn: "2h" }
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (authErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  if (user.email !== process.env.NEXT_PUBLIC_DOCTOR_EMAIL) {
    return NextResponse.json({ error: "Only the doctor can create meetings" }, { status: 403 });
  }

  try {
    const token = makeDoctorToken();
    const res = await fetch("https://api.videosdk.live/v2/rooms", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`VideoSDK error: ${res.status}`);
    const { roomId } = (await res.json()) as { roomId: string };

    await supabaseAdmin.from("doctor_meetings").insert({
      room_name: roomId,
      room_url: roomId,
      code: roomId,
      expires_at: new Date(Date.now() + 7_200_000).toISOString(),
      is_active: true,
    });

    return NextResponse.json({ meetingId: roomId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
