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
      console.warn('[meet] credentials not set — skipping');
      return null;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/meetings.space.created'],
    });

    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    if (!tokenRes.token) {
      console.error('[meet] Failed to obtain access token');
      return null;
    }

    const res = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[meet] Meet API ${res.status}: ${body}`);
      return null;
    }

    const data = await res.json() as { meetingUri?: string };
    return data.meetingUri ?? null;
  } catch (err) {
    console.error('[meet] Failed to generate Meet link:', err);
    return null;
  }
}
