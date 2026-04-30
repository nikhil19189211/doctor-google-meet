import { google } from 'googleapis';

function parseToUTC(dateStr: string, timeStr: string, tz: string): Date {
  const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return new Date(NaN);

  let h = parseInt(m[1]);
  const mins = parseInt(m[2]);
  const isPM = m[3].toUpperCase() === 'PM';
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;

  const [y, mo, d] = dateStr.split('-').map(Number);
  const t0 = Date.UTC(y, mo - 1, d, h, mins, 0);

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

  if (parts.hour === 24) parts.hour = 0;
  const tzTime = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(t0 + (t0 - tzTime));
}

export async function generateMeetLink(
  appointmentId: string,
  date: string,
  time: string,
  tz: string,
): Promise<string | null> {
  try {
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
      console.warn('[meet] GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not set — skipping');
      return null;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const start = parseToUTC(date, time, tz);
    if (isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: 'Video Consultation',
        start: { dateTime: start.toISOString(), timeZone: 'UTC' },
        end: { dateTime: end.toISOString(), timeZone: 'UTC' },
        conferenceData: {
          createRequest: {
            requestId: appointmentId,  // idempotent — same appointmentId → same Meet room
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    return event.data.conferenceData?.entryPoints?.[0]?.uri ?? null;
  } catch (err) {
    console.error('[meet] Failed to generate Meet link:', err);
    return null;
  }
}
