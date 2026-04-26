import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from "jsonwebtoken";

function generateVideoSDKToken(isDoctor: boolean): string {
  const apiKey = process.env.VIDEOSDK_API_KEY;
  const secretKey = process.env.VIDEOSDK_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("VideoSDK credentials not configured");
  }

  return jwt.sign(
    {
      apikey: apiKey,
      permissions: isDoctor ? ["allow_join", "allow_mod"] : ["allow_join"],
      version: 2,
      roles: [],
    },
    secretKey,
    { algorithm: "HS256", expiresIn: "2h" }
  );
}

async function createVideoSDKRoom(token: string): Promise<string> {
  const res = await fetch("https://api.videosdk.live/v2/rooms", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(`VideoSDK room creation failed: ${res.status}`);
  }

  const { roomId } = (await res.json()) as { roomId: string };
  return roomId;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId } = body as { appointmentId?: string };

    if (!appointmentId || typeof appointmentId !== "string") {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const bearerToken = authHeader.slice(7);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(bearerToken);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const { data: appointment, error: apptError } = await supabaseAdmin
      .from("appointments")
      .select("id, user_id, mode, status")
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptError || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const doctorEmail = process.env.NEXT_PUBLIC_DOCTOR_EMAIL ?? "";
    const isDoctor = !!doctorEmail && user.email === doctorEmail;
    const isPatient = user.id === appointment.user_id;

    if (!isDoctor && !isPatient) {
      return NextResponse.json(
        { error: "You are not authorised to join this consultation" },
        { status: 403 }
      );
    }

    if (appointment.mode !== "Video") {
      return NextResponse.json(
        { error: "This appointment is not a video consultation" },
        { status: 400 }
      );
    }

    if (!["confirmed", "completed"].includes(appointment.status)) {
      return NextResponse.json(
        { error: "Appointment is not yet confirmed" },
        { status: 400 }
      );
    }

    const videoToken = generateVideoSDKToken(isDoctor);

    // Look up an existing VideoSDK room for this appointment
    const { data: existingSession } = await supabaseAdmin
      .from("video_sessions")
      .select("meeting_id")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    let meetingId: string;

    if (existingSession?.meeting_id) {
      meetingId = existingSession.meeting_id;
    } else {
      // First caller (doctor or patient) creates the room
      meetingId = await createVideoSDKRoom(videoToken);
      await supabaseAdmin.from("video_sessions").insert({
        appointment_id: appointmentId,
        meeting_id: meetingId,
      });
    }

    return NextResponse.json({ meetingId, token: videoToken, isDoctor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
