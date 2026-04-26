import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from "jsonwebtoken";

function generateToken(isDoctor: boolean): string {
  const apiKey = process.env.VIDEOSDK_API_KEY;
  const secret = process.env.VIDEOSDK_SECRET_KEY;
  if (!apiKey || !secret) throw new Error("VideoSDK credentials not configured");
  return jwt.sign(
    {
      apikey: apiKey,
      permissions: isDoctor ? ["allow_join", "allow_mod"] : ["allow_join"],
      version: 2,
      roles: [],
    },
    secret,
    { algorithm: "HS256", expiresIn: "2h" }
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const body = (await req.json()) as { meetingId?: string };
  if (!body.meetingId) return NextResponse.json({ error: "meetingId required" }, { status: 400 });

  const isDoctor = user.email === process.env.NEXT_PUBLIC_DOCTOR_EMAIL;
  const token = generateToken(isDoctor);
  const userName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Participant";

  return NextResponse.json({ token, isDoctor, userName });
}
