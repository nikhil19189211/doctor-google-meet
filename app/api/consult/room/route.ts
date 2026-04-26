import { NextResponse } from "next/server";

// Patients cannot create meeting rooms.
// Only the doctor (via /api/admin/meetings) can generate meeting codes.
export async function POST() {
  return NextResponse.json(
    { error: "Only the doctor can create meeting rooms. Please ask your doctor for a session code." },
    { status: 403 }
  );
}
