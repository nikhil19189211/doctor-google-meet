import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateCode, storeCode } from "@/lib/consult-codes";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("doctor_meetings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ meetings: data ?? [] });
}

export async function POST() {
  try {
    const code = generateCode();
    const expiresAtSec = Math.floor(Date.now() / 1000) + 7200;

    storeCode(code, expiresAtSec);

    await supabaseAdmin.from("doctor_meetings").insert({
      room_name: code,
      room_url: code,
      code,
      expires_at: new Date(expiresAtSec * 1000).toISOString(),
      is_active: true,
    });

    return NextResponse.json({ roomId: code, code });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("doctor_meetings")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
