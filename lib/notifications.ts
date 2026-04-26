import nodemailer from 'nodemailer';

// ── Gmail SMTP via App Password ─────────────────────────────────────────────

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn('[notifications] GMAIL_USER / GMAIL_APP_PASSWORD not set, skipping email');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;
  const from = process.env.GMAIL_FROM || process.env.GMAIL_USER;
  await transporter.sendMail({ from, to, subject, html });
}

// ── Doctor timezone helpers ──────────────────────────────────────────────────

function doctorTimezone(): string {
  return process.env.DOCTOR_TIMEZONE || 'Asia/Kolkata';
}

// Returns short timezone abbreviation, e.g. "EST", "IST", "CET"
function doctorTzAbbr(): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: doctorTimezone(), timeZoneName: 'short' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value ?? doctorTimezone();
  } catch {
    return doctorTimezone();
  }
}

// ── Invoice number helper ────────────────────────────────────────────────────

function invoiceNumber(appointmentId: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const suffix = appointmentId.replace(/-/g, '').slice(-6).toUpperCase();
  return `INV-${y}${m}-${suffix}`;
}

// ── Shared interfaces ────────────────────────────────────────────────────────

export interface AppointmentInfo {
  id: string;
  date: string;
  time: string;
  type: string;
  mode: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  amount?: number;
  currency?: string;
  gateway?: string;
}

export interface MeetingInfo {
  code: string;
  url: string;
}

// ── Email 1: Payment confirmation + invoice ──────────────────────────────────

export async function sendPaymentConfirmation(appt: AppointmentInfo): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const currencyLabel = (appt.currency || 'USD').toUpperCase();
  const amountLabel = appt.amount ? `${currencyLabel} ${appt.amount.toFixed(2)}` : '';
  const invNo = invoiceNumber(appt.id);
  const invoiceDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric', timeZone: doctorTimezone() });
  const tzAbbr = doctorTzAbbr();
  const gatewayLabel = appt.gateway === 'stripe' ? 'Card (Stripe)' : appt.gateway === 'paypal' ? 'PayPal' : appt.gateway || 'Online';

  const html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

  <div style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:28px 32px;color:#fff">
    <h1 style="margin:0;font-size:22px">Appointment Confirmed ✓</h1>
    <p style="margin:6px 0 0;opacity:.85;font-size:14px">Payment received — see your invoice below</p>
  </div>

  <div style="padding:28px 32px 0">
    <p style="margin:0 0 24px;color:#374151">Hi <strong>${appt.patientName}</strong>, your booking is confirmed and payment has been received.</p>
  </div>

  <div style="padding:0 32px 24px">
    <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280">Appointment Details</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 0;color:#6b7280;width:40%">Date</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.date}</td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 0;color:#6b7280">Time</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.time} <span style="font-weight:400;color:#6b7280;font-size:12px">${tzAbbr}</span></td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 0;color:#6b7280">Consultation Type</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.type}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#6b7280">Mode</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.mode}</td>
      </tr>
    </table>
  </div>

  ${amountLabel ? `
  <div style="margin:0 32px 28px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="background:#f9fafb;padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:700;color:#111827;font-size:15px">Invoice</span>
      <span style="font-size:12px;color:#6b7280">${invNo}</span>
    </div>
    <div style="padding:16px 18px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 0;color:#6b7280">Invoice No.</td>
          <td style="padding:8px 0;color:#374151;text-align:right">${invNo}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 0;color:#6b7280">Invoice Date</td>
          <td style="padding:8px 0;color:#374151;text-align:right">${invoiceDate}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 0;color:#6b7280">Patient</td>
          <td style="padding:8px 0;color:#374151;text-align:right">${appt.patientName}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 0;color:#6b7280">Service</td>
          <td style="padding:8px 0;color:#374151;text-align:right">${appt.type} — ${appt.mode}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 0;color:#6b7280">Payment Method</td>
          <td style="padding:8px 0;color:#374151;text-align:right">${gatewayLabel}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#111827;font-weight:700;font-size:14px">Total Paid</td>
          <td style="padding:10px 0;color:#0d9488;font-weight:700;font-size:16px;text-align:right">${amountLabel}</td>
        </tr>
      </table>
    </div>
  </div>` : ''}

  <div style="padding:0 32px 28px">
    ${appt.mode === 'Video' ? `
    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:14px 16px">
      <p style="margin:0;color:#0f766e;font-size:13px">📹 This is a <strong>Video consultation</strong>. You will receive a meeting link <strong>15 minutes before</strong> your appointment.</p>
    </div>` : `
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 16px">
      <p style="margin:0;color:#0369a1;font-size:13px">🏥 This is an <strong>In-Person visit</strong>. Please arrive <strong>10 minutes early</strong>.</p>
    </div>`}
    <div style="margin-top:24px;text-align:center">
      <a href="${appUrl}/dashboard/appointments" style="background:#0d9488;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">View My Appointment</a>
    </div>
  </div>

  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center">
    Dr. Carter Medical Clinic · Questions? Reply to this email
  </div>
</div>
</body></html>`;

  await sendEmail(appt.patientEmail, `Appointment Confirmed — Invoice ${invNo}`, html).catch(console.error);
}

// ── Email 2: 24-hour reminder ────────────────────────────────────────────────

export async function sendReminderNotification(appt: AppointmentInfo): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;color:#fff">
    <h1 style="margin:0;font-size:22px">⏰ Appointment Tomorrow</h1>
    <p style="margin:6px 0 0;opacity:.85;font-size:14px">24-hour reminder</p>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 20px;color:#374151">Hi <strong>${appt.patientName}</strong>, your appointment is tomorrow.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 0;color:#6b7280;width:40%">Date</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.date}</td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 0;color:#6b7280">Time</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.time} <span style="font-weight:400;color:#6b7280;font-size:12px">${doctorTzAbbr()}</span></td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 0;color:#6b7280">Consultation Type</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.type}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#6b7280">Mode</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.mode}</td>
      </tr>
    </table>
    ${appt.mode === 'Video'
      ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-top:20px"><p style="margin:0;color:#1d4ed8;font-size:13px">📹 You will receive your <strong>meeting link 15 minutes before</strong> the appointment.</p></div>`
      : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin-top:20px"><p style="margin:0;color:#15803d;font-size:13px">🏥 In-Person visit — please arrive <strong>10 minutes early</strong>.</p></div>`}
    <div style="margin-top:28px;text-align:center">
      <a href="${appUrl}/dashboard/appointments" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">View Appointment</a>
    </div>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center">
    Dr. Carter Medical Clinic
  </div>
</div>
</body></html>`;

  await sendEmail(appt.patientEmail, 'Reminder: Appointment Tomorrow — Dr. Carter', html).catch(console.error);
}

// ── Email 3: 15-min notification (patient + doctor) ──────────────────────────

export async function sendMeetingNotification(
  appt: AppointmentInfo,
  meeting: MeetingInfo | null,
  doctorEmail: string,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const isVideo = appt.mode === 'Video' && meeting;

  const patientHtml = buildMeetingEmail({ recipientName: appt.patientName, forDoctor: false, appt, meeting, appUrl, isVideo });
  const doctorHtml = buildMeetingEmail({ recipientName: 'Doctor', forDoctor: true, appt, meeting, appUrl, isVideo });

  await Promise.all([
    sendEmail(appt.patientEmail, 'Your Appointment Starts in 15 Minutes', patientHtml).catch(console.error),
    sendEmail(doctorEmail, `Appointment in 15 min — ${appt.patientName}`, doctorHtml).catch(console.error),
  ]);
}

function buildMeetingEmail(opts: {
  recipientName: string;
  forDoctor: boolean;
  appt: AppointmentInfo;
  meeting: MeetingInfo | null;
  appUrl: string;
  isVideo: boolean | null;
}): string {
  const { recipientName, forDoctor, appt, meeting, appUrl, isVideo } = opts;
  const headline = forDoctor
    ? `Appointment in 15 min — ${appt.patientName}`
    : 'Your Appointment Starts in 15 Minutes';

  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;color:#fff">
    <h1 style="margin:0;font-size:22px">🚀 ${headline}</h1>
    <p style="margin:6px 0 0;opacity:.85;font-size:14px">Get ready — it starts soon!</p>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 20px;color:#374151">Hi <strong>${recipientName}</strong>, your appointment is in <strong>15 minutes</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 0;color:#6b7280;width:40%">Date</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.date}</td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 0;color:#6b7280">Time</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.time} <span style="font-weight:400;color:#6b7280;font-size:12px">${doctorTzAbbr()}</span></td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 0;color:#6b7280">Type</td>
        <td style="padding:10px 0;color:#111827;font-weight:600">${appt.type}</td>
      </tr>
      ${forDoctor ? `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280">Patient</td><td style="padding:10px 0;color:#111827;font-weight:600">${appt.patientName}</td></tr>` : ''}
    </table>
    ${isVideo && meeting ? `
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:18px 20px;margin-top:20px">
      <p style="margin:0 0 10px;color:#7c3aed;font-weight:700;font-size:15px">📹 Video Consultation</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151">Session Code: <strong style="font-size:20px;letter-spacing:4px;color:#6d28d9">${meeting.code}</strong></p>
      <p style="margin:0;font-size:13px;color:#6b7280">Or join directly:</p>
      <a href="${meeting.url}" style="display:inline-block;margin-top:10px;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 22px;border-radius:7px;font-weight:600;font-size:14px">Join Video Call</a>
    </div>` : `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin-top:20px">
      <p style="margin:0;color:#15803d;font-size:13px">🏥 In-Person appointment — ${forDoctor ? 'patient is on their way.' : 'please head to the clinic now.'}</p>
    </div>`}
    ${!isVideo ? `
    <div style="margin-top:24px;text-align:center">
      <a href="${appUrl}/dashboard/appointments" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">View Details</a>
    </div>` : ''}
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center">
    Dr. Carter Medical Clinic
  </div>
</div>
</body></html>`;
}
