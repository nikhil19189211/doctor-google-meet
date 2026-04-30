import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendReminder24h,
  sendReminderInPerson1h,
} from '@/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Convert "YYYY-MM-DD" + "9:00 AM" in a given IANA timezone to a UTC Date.
function appointmentToUTC(dateStr: string, timeStr: string, tz: string): Date {
  const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return new Date(NaN);

  let h = parseInt(m[1]);
  const mins = parseInt(m[2]);
  const isPM = m[3].toUpperCase() === 'PM';
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;

  const [y, mo, d] = dateStr.split('-').map(Number);

  // Treat local clock time as UTC for a reference point
  const t0 = Date.UTC(y, mo - 1, d, h, mins, 0);

  // Find what clock time t0 (UTC) displays in the target timezone
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false, hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(t0))
      .filter(p => p.type !== 'literal')
      .map(p => [p.type, parseInt(p.value)])
  );

  // Normalize hour=24 (some implementations use 24 for midnight)
  if (parts.hour === 24) parts.hour = 0;

  const tzTime = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMs = t0 - tzTime; // positive = timezone is behind UTC

  return new Date(t0 + offsetMs);
}

export async function GET(req: Request) {
  // Verify cron secret when set (Vercel sends it as Bearer in Authorization header)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const tz = process.env.DOCTOR_TIMEZONE ?? 'UTC';
  const now = Date.now();

  // Fetch appointments that are paid and not cancelled.
  // Look back 1 day so we don't miss appointments crossing midnight.
  const lookbackDate = new Date(now - 26 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: appointments, error } = await supabaseAdmin
    .from('appointments')
    .select(`
      id, user_id, date, time, type, mode, status,
      payments!inner(status)
    `)
    .neq('status', 'cancelled')
    .gte('date', lookbackDate)
    .eq('payments.status', 'paid')
    .order('date', { ascending: true });

  if (error) {
    console.error('[cron] DB error:', error.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const results = { checked: appointments?.length ?? 0, sent: 0, skipped: 0, errors: 0 };

  for (const appt of (appointments ?? [])) {
    const apptUTC = appointmentToUTC(appt.date, appt.time, tz);
    if (isNaN(apptUTC.getTime())) continue;

    const diffMs = apptUTC.getTime() - now;
    const diffMin = diffMs / 60_000;
    const diffHours = diffMs / 3_600_000;

    // Determine which notification window this appointment falls into
    let notifType: 'reminder_24h' | 'reminder_1h' | null = null;

    if (diffHours >= 23 && diffHours <= 25) {
      notifType = 'reminder_24h';
    } else if (diffMin >= 50 && diffMin <= 70) {
      notifType = 'reminder_1h';
    }

    if (!notifType) continue;

    // Skip if already sent (notification_log has unique constraint on appointment_id + type)
    const { data: alreadySent } = await supabaseAdmin
      .from('notification_log')
      .select('id')
      .eq('appointment_id', appt.id)
      .eq('type', notifType)
      .maybeSingle();

    if (alreadySent) {
      results.skipped++;
      continue;
    }

    // Fetch patient email + name from Supabase Auth
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(appt.user_id);
    if (!userData?.user?.email) {
      results.errors++;
      continue;
    }

    const user = userData.user;
    const patientEmail = user.email!;
    const patientName =
      (user.user_metadata?.full_name as string | undefined) ??
      patientEmail.split('@')[0];

    const base = {
      patientName,
      patientEmail,
      appointmentId: appt.id,
      date: appt.date,
      time: appt.time,
      type: appt.type,
      mode: appt.mode,
    };

    try {
      if (notifType === 'reminder_24h') {
        await sendReminder24h(base);
      } else {
        await sendReminderInPerson1h(base);
      }

      await supabaseAdmin
        .from('notification_log')
        .insert({ appointment_id: appt.id, type: notifType });

      results.sent++;
    } catch (err) {
      console.error(`[cron] Failed ${notifType} for ${appt.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
