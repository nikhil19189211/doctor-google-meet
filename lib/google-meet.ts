import { google } from 'googleapis';

export async function generateMeetLink(
  _appointmentId: string,
  _date: string,
  _time: string,
  _tz: string,
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
      scopes: ['https://www.googleapis.com/auth/meetings.space.created'],
    });

    const meet = google.meet({ version: 'v2', auth });
    const space = await meet.spaces.create({ requestBody: {} });
    return space.data.meetingUri ?? null;
  } catch (err) {
    console.error('[meet] Failed to generate Meet link:', err);
    return null;
  }
}
