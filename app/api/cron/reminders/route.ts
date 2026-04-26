import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateCode, storeCode } from '@/lib/consult-codes';
import {
  sendReminderNotification,
  sendMeetingNotification,
  AppointmentInfo,
  MeetingInfo,
} from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Vercel cron sends Authorization: Bearer <CRON_SECRET>
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode: open
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

// Converts a local date-time string (no tz) into a UTC Date using the doctor's timezone.
// DST-safe: uses Intl to compute the real offset at that instant.
function parseInTz(localDt: string, tz: string): Date {
  const naive = new Date(localDt + 'Z'); // treat as UTC to get a reference instant
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const p = fmt.formatToParts(naive);
  const get = (type: string) => parseInt(p.find(pt => pt.type === type)?.value ?? '0');
  const tzAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  // offset = how far tz is ahead of UTC; subtract it to get real UTC for the local time
  return new Date(naive.getTime() - (tzAsUtc - naive.getTime()));
}

function parseAppointmentDateTime(date: string, time: string): Date {
  // date: "2026-04-21", time: "9:00 AM" or "2:30 PM"
  // Uses DOCTOR_TIMEZONE so cron diff calculations are correct regardless of server timezone
  const tz = process.env.DOCTOR_TIMEZONE || 'Asia/Kolkata';
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return parseInTz(`${date}T00:00`, tz);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  if (match[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  return parseInTz(`${date}T${h}:${m}`, tz);
}

async function getUserInfo(userId: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (!data?.user) return null;
  const user = data.user;
  return {
    email: user.email!,
    name: (user.user_metadata?.full_name as string) || user.email!.split('@')[0],
    phone: user.user_metadata?.phone as string | undefined,
  };
}

async function alreadyNotified(appointmentId: string, type: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('notification_log')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('type', type)
    .maybeSingle();
  return !!data;
}

async function markNotified(appointmentId: string, type: string) {
  await supabaseAdmin
    .from('notification_log')
    .upsert({ appointment_id: appointmentId, type }, { onConflict: 'appointment_id,type' });
}

async function createVideoRoom(): Promise<{ code: string; url: string; roomName: string } | null> {
  try {
    const expiresAt = Math.floor(Date.now() / 1000) + 7200; // 2-hour room
    const code = generateCode();
    storeCode(code, expiresAt);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await supabaseAdmin.from('doctor_meetings').insert({
      room_name: code,
      room_url: code,
      code,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      is_active: true,
    });

    return { code, url: `${appUrl}/consult`, roomName: code };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const doctorEmail = process.env.NEXT_PUBLIC_DOCTOR_EMAIL!;

  // Fetch all confirmed appointments that haven't been fully notified
  const { data: appointments, error } = await supabaseAdmin
    .from('appointments')
    .select('id, date, time, type, mode, user_id, status')
    .in('status', ['confirmed', 'pending']);

  if (error || !appointments) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const results = { reminder_24h: 0, reminder_15m: 0, skipped: 0 };

  for (const appt of appointments) {
    const apptTime = parseAppointmentDateTime(appt.date, appt.time);
    const diffMs = apptTime.getTime() - now.getTime();
    const diffMin = diffMs / 60000;

    // ── 24-hour reminder: fire when 23h ≤ diff < 25h ────────────────────────
    if (diffMin >= 23 * 60 && diffMin < 25 * 60) {
      if (await alreadyNotified(appt.id, 'reminder_24h')) { results.skipped++; continue; }

      const user = await getUserInfo(appt.user_id);
      if (!user) continue;

      const info: AppointmentInfo = {
        id: appt.id,
        date: appt.date,
        time: appt.time,
        type: appt.type,
        mode: appt.mode,
        patientName: user.name,
        patientEmail: user.email,
      };

      sendReminderNotification(info).catch(console.error);
      await markNotified(appt.id, 'reminder_24h');
      results.reminder_24h++;
    }

    // ── 15-minute meeting notification: fire when 10 ≤ diff < 20 min ────────
    else if (diffMin >= 10 && diffMin < 20) {
      if (await alreadyNotified(appt.id, 'reminder_15m')) { results.skipped++; continue; }

      const user = await getUserInfo(appt.user_id);
      if (!user) continue;

      const info: AppointmentInfo = {
        id: appt.id,
        date: appt.date,
        time: appt.time,
        type: appt.type,
        mode: appt.mode,
        patientName: user.name,
        patientEmail: user.email,
      };

      let meeting: MeetingInfo | null = null;
      if (appt.mode === 'Video') {
        const room = await createVideoRoom();
        if (room) meeting = { code: room.code, url: room.url };
      }

      sendMeetingNotification(info, meeting, doctorEmail).catch(console.error);
      await markNotified(appt.id, 'reminder_15m');
      results.reminder_15m++;
    }
  }

  return NextResponse.json({ ok: true, ...results, checkedAt: now.toISOString() });
}
