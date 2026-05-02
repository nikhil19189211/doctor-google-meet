import { google } from 'googleapis';

export async function generateMeetLink(
  _appointmentId: string,
  _date: string,
  _time: string,
  _tz: string,
): Promise<string | null> {
  try {
    const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env;
    if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
      console.warn('[meet] OAuth credentials not set — skipping');
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });

    const tokenRes = await oauth2Client.getAccessToken();
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
