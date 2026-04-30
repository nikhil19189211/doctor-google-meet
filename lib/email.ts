import nodemailer from 'nodemailer';

// ─── Config ───────────────────────────────────────────────────────────────────
const CLINIC_NAME = process.env.CLINIC_NAME ?? 'Medical Clinic';
const CLINIC_ADDRESS = process.env.CLINIC_ADDRESS ?? '';
const CLINIC_PHONE = process.env.CLINIC_PHONE ?? '';
const CLINIC_MAPS_URL = process.env.CLINIC_MAPS_URL ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AppointmentEmailData {
  patientName: string;
  patientEmail: string;
  appointmentId: string;
  date: string;  // "YYYY-MM-DD"
  time: string;  // "9:00 AM"
  type: string;  // "General Consultation"
  mode: string;  // "In-Person" | "Video"
}

export interface PaymentConfirmationData extends AppointmentEmailData {
  amount: number;
  currency: string;
  gateway: string;
  gatewayPaymentId: string;
}

// ─── Transport ────────────────────────────────────────────────────────────────
function makeTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });
}

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping send');
    return;
  }
  const from = process.env.GMAIL_FROM ?? `${CLINIC_NAME} <${process.env.GMAIL_USER}>`;
  await makeTransport().sendMail({ from, to, subject, html });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

function fmtCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function invoiceNo(appointmentId: string, date: string): string {
  return `INV-${date.replace(/-/g, '')}-${appointmentId.replace(/-/g, '').slice(-6).toUpperCase()}`;
}

function gatewayLabel(gateway: string): string {
  return gateway === 'stripe' ? 'Credit / Debit Card (Stripe)' : 'PayPal';
}

// ─── Base Layout ──────────────────────────────────────────────────────────────
function layout(
  iconBg: string,
  icon: string,
  headline: string,
  subline: string,
  body: string,
): string {
  const footerAddress = [CLINIC_NAME, CLINIC_ADDRESS, CLINIC_PHONE]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#EFF6FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header bar -->
  <tr>
    <td style="background:linear-gradient(135deg,#1E3A5F 0%,#1D4ED8 100%);padding:28px 40px;border-radius:12px 12px 0 0;text-align:center;">
      <p style="margin:0;font-size:19px;font-weight:700;color:#FFFFFF;letter-spacing:0.3px;">${CLINIC_NAME}</p>
      <p style="margin:5px 0 0;font-size:11px;color:#93C5FD;letter-spacing:2px;text-transform:uppercase;">Patient Portal</p>
    </td>
  </tr>

  <!-- Icon + headline -->
  <tr>
    <td style="background:#FFFFFF;padding:40px 40px 0;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">
        <tr>
          <td width="68" height="68" style="background:${iconBg};border-radius:50%;text-align:center;vertical-align:middle;font-size:30px;line-height:68px;">${icon}</td>
        </tr>
      </table>
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">${headline}</h1>
      <p style="margin:8px 0 0;font-size:15px;color:#6B7280;">${subline}</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background:#FFFFFF;padding:28px 40px 40px;border-radius:0 0 12px 12px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
      ${body}
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;border-top:1px solid #E5E7EB;padding-top:24px;">
        <tr>
          <td align="center">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">${footerAddress}</p>
            <p style="margin:7px 0 0;font-size:11px;color:#D1D5DB;">This is an automated message — please do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Shared snippets ──────────────────────────────────────────────────────────
function apptCard(d: AppointmentEmailData): string {
  const modeColor = d.mode === 'Video'
    ? 'background:#EDE9FE;color:#6D28D9;'
    : 'background:#D1FAE5;color:#065F46;';

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;margin:24px 0;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;">Appointment Details</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#374151;">Date</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;">${fmtDate(d.date)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#374151;border-top:1px solid #F3F4F6;">Time</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;border-top:1px solid #F3F4F6;">${d.time}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#374151;border-top:1px solid #F3F4F6;">Appointment Type</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;border-top:1px solid #F3F4F6;">${d.type}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#374151;border-top:1px solid #F3F4F6;">Mode</td>
        <td style="padding:8px 0;text-align:right;border-top:1px solid #F3F4F6;">
          <span style="${modeColor}padding:3px 12px;border-radius:20px;font-size:13px;font-weight:600;">${d.mode}</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>`;
}

function ctaButton(label: string, url: string, bg = '#1D4ED8'): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
  <tr><td align="center">
    <a href="${url}" style="display:inline-block;background:${bg};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.2px;">${label}</a>
  </td></tr>
</table>`;
}

// ─── Email 1: Payment Confirmation ────────────────────────────────────────────
export async function sendPaymentConfirmation(data: PaymentConfirmationData): Promise<void> {
  const subtotal = Math.round((data.amount / 1.1) * 100) / 100;
  const tax = Math.round((data.amount - subtotal) * 100) / 100;
  const invNo = invoiceNo(data.appointmentId, data.date);
  const paidOn = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const body = `
<p style="font-size:15px;color:#374151;margin:0 0 6px;">Hi <strong>${data.patientName}</strong>,</p>
<p style="font-size:15px;color:#374151;margin:0 0 4px;">Your payment was successful and your appointment is <strong>confirmed</strong>.</p>
<p style="font-size:14px;color:#9CA3AF;margin:0;">A reminder will be sent 24 hours before your appointment.</p>

${apptCard(data)}

<!-- Invoice -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;margin:0 0 24px;">
  <tr><td style="padding:20px 24px;">

    <!-- Invoice header row -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
      <tr>
        <td style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;">Invoice</td>
        <td style="font-size:12px;color:#9CA3AF;text-align:right;">${invNo} &nbsp;·&nbsp; ${paidOn}</td>
      </tr>
    </table>

    <!-- Line items -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E7EB;">
      <tr>
        <td style="padding:9px 0;font-size:14px;color:#374151;">Consultation Fee</td>
        <td style="padding:9px 0;font-size:14px;color:#111827;text-align:right;">${fmtCurrency(subtotal, data.currency)}</td>
      </tr>
      <tr>
        <td style="padding:9px 0;font-size:14px;color:#374151;border-top:1px solid #F3F4F6;">Tax (10%)</td>
        <td style="padding:9px 0;font-size:14px;color:#111827;text-align:right;border-top:1px solid #F3F4F6;">${fmtCurrency(tax, data.currency)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 10px;font-size:16px;font-weight:700;color:#111827;border-top:2px solid #E5E7EB;">Total Paid</td>
        <td style="padding:12px 0 10px;font-size:16px;font-weight:700;color:#1D4ED8;text-align:right;border-top:2px solid #E5E7EB;">${fmtCurrency(data.amount, data.currency)}</td>
      </tr>
      <tr>
        <td style="padding:9px 0;font-size:13px;color:#6B7280;border-top:1px solid #F3F4F6;">Payment Method</td>
        <td style="padding:9px 0;font-size:13px;color:#6B7280;text-align:right;border-top:1px solid #F3F4F6;">${gatewayLabel(data.gateway)}</td>
      </tr>
      <tr>
        <td style="padding:9px 0;font-size:13px;color:#6B7280;border-top:1px solid #F3F4F6;">Transaction ID</td>
        <td style="padding:9px 0;font-size:12px;color:#6B7280;font-family:monospace;text-align:right;border-top:1px solid #F3F4F6;word-break:break-all;">${data.gatewayPaymentId}</td>
      </tr>
    </table>
  </td></tr>
</table>

${ctaButton('Go to My Dashboard', APP_URL + '/dashboard')}`;

  await send(
    data.patientEmail,
    `Appointment Confirmed — ${fmtDate(data.date)} at ${data.time}`,
    layout('#D1FAE5', '✓', 'Payment Successful', 'Your appointment is confirmed.', body),
  );
}

// ─── Email 2: 24-hour Reminder ────────────────────────────────────────────────
export async function sendReminder24h(data: AppointmentEmailData): Promise<void> {
  const modeNote = `Please plan to <strong>arrive 10 minutes early</strong> to complete any necessary paperwork.${CLINIC_ADDRESS ? '<br><br>Clinic: ' + CLINIC_NAME + ', ' + CLINIC_ADDRESS : ''}`;

  const body = `
<p style="font-size:15px;color:#374151;margin:0 0 6px;">Hi <strong>${data.patientName}</strong>,</p>
<p style="font-size:15px;color:#374151;margin:0;">This is a friendly reminder that your appointment is scheduled for <strong>tomorrow</strong>.</p>

${apptCard(data)}

<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;margin:0 0 24px;">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0;font-size:14px;color:#92400E;line-height:1.6;">${modeNote}</p>
  </td></tr>
</table>

${ctaButton('View My Appointment', APP_URL + '/dashboard', '#D97706')}

<p style="font-size:13px;color:#9CA3AF;text-align:center;margin:16px 0 0;">Need to reschedule? Please contact us as soon as possible${CLINIC_PHONE ? ' at <strong>' + CLINIC_PHONE + '</strong>' : ''}.</p>`;

  await send(
    data.patientEmail,
    `Reminder: Appointment Tomorrow — ${fmtDate(data.date)} at ${data.time}`,
    layout('#FEF3C7', '⏰', 'Your Appointment is Tomorrow', `${fmtDate(data.date)} at ${data.time}`, body),
  );
}

// ─── Email 3: 1-hour In-Person Reminder ───────────────────────────────────────
export async function sendReminderInPerson1h(data: AppointmentEmailData): Promise<void> {
  const hasAddress = CLINIC_ADDRESS.trim().length > 0;
  const hasPhone = CLINIC_PHONE.trim().length > 0;
  const hasMap = CLINIC_MAPS_URL.trim().length > 0;

  const addressCard = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;margin:24px 0;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;">Clinic Location</p>
    <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">${CLINIC_NAME}</p>
    ${hasAddress ? `<p style="margin:0 0 ${hasPhone ? '6px' : '0'};font-size:14px;color:#374151;line-height:1.6;">${CLINIC_ADDRESS}</p>` : ''}
    ${hasPhone ? `<p style="margin:0 ${hasMap ? '0 16px' : ''};font-size:14px;color:#374151;">&#128222; ${CLINIC_PHONE}</p>` : ''}
    ${hasMap ? `
    <table cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr><td>
        <a href="${CLINIC_MAPS_URL}" style="display:inline-block;background:#DC2626;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:7px;">&#128205; Get Directions</a>
      </td></tr>
    </table>` : ''}
  </td></tr>
</table>`;

  const body = `
<p style="font-size:15px;color:#374151;margin:0 0 6px;">Hi <strong>${data.patientName}</strong>,</p>
<p style="font-size:15px;color:#374151;margin:0;">Your in-person appointment begins in <strong>1 hour</strong>. We look forward to seeing you!</p>

${apptCard(data)}
${addressCard}

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;margin:0 0 24px;">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;">What to bring</p>
    <p style="margin:3px 0;font-size:13px;color:#6B7280;">&#10003; Valid photo ID</p>
    <p style="margin:3px 0;font-size:13px;color:#6B7280;">&#10003; Insurance card (if applicable)</p>
    <p style="margin:3px 0;font-size:13px;color:#6B7280;">&#10003; List of current medications</p>
    <p style="margin:3px 0;font-size:13px;color:#6B7280;">&#10003; Any relevant medical records or test results</p>
  </td></tr>
</table>

${ctaButton('View My Appointment', APP_URL + '/dashboard', '#DC2626')}

<p style="font-size:13px;color:#9CA3AF;text-align:center;margin:16px 0 0;">Please arrive 10 minutes early.${hasPhone ? ' Questions? Call us at <strong>' + CLINIC_PHONE + '</strong>.' : ''}</p>`;

  await send(
    data.patientEmail,
    `Starting Soon: In-Person Appointment at ${data.time}`,
    layout('#FEE2E2', '&#128205;', 'Your Appointment is in 1 Hour', `${fmtDate(data.date)} at ${data.time}`, body),
  );
}

