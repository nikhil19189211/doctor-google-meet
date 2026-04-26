import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week"); // YYYY-MM-DD Monday of the week

  let query = supabaseAdmin
    .from("available_slots")
    .select("*")
    .order("day_of_week")
    .order("time_slot");

  if (week) query = query.eq("week_start_date", week);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slots: data ?? [] });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { slots } = body as {
    slots: { week_start_date: string; day_of_week: number; time_slot: string; is_active: boolean }[];
  };

  if (!Array.isArray(slots)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("available_slots")
    .upsert(slots, { onConflict: "week_start_date,day_of_week,time_slot" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
