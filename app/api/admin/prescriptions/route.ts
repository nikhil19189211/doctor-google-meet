import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST — doctor sends a prescription to a patient during / after a video consultation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientEmail, diagnosis, medications, doctorNote, followUp, appointmentId } = body;

    if (!patientEmail || !diagnosis || !medications?.length) {
      return NextResponse.json(
        { error: "patientEmail, diagnosis, and at least one medication are required" },
        { status: 400 }
      );
    }

    // Resolve patient user ID from email
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.listUsers();
    if (userErr) {
      return NextResponse.json({ error: "Failed to look up patient" }, { status: 500 });
    }

    const patient = userData.users.find(
      (u) => u.email?.toLowerCase() === patientEmail.toLowerCase().trim()
    );

    if (!patient) {
      return NextResponse.json(
        { error: `No registered patient found with email: ${patientEmail}` },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("prescriptions")
      .insert({
        patient_id: patient.id,
        appointment_id: appointmentId ?? null,
        diagnosis: diagnosis.trim(),
        doctor_note: (doctorNote ?? "").trim(),
        medications,
        follow_up: followUp || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, prescription: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — doctor fetches all prescriptions they've issued (most recent first)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("prescriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prescriptions: data ?? [] });
}
