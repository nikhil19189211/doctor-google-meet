/**
 * Test script for Gmail SMTP (App Password) email notifications.
 * Run: node test-notifications.mjs
 *
 * Prerequisites:
 *  - 2FA enabled on your Google account
 *  - App Password created at: myaccount.google.com → Security → App passwords
 *  - GMAIL_USER and GMAIL_APP_PASSWORD set in .env.local
 */

import { readFileSync } from 'fs';
import nodemailer from 'nodemailer';

// Load .env.local manually
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const {
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  GMAIL_FROM,
  NEXT_PUBLIC_APP_URL = 'http://localhost:3000',
} = env;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD === 'your_16_char_app_password_here') {
  console.error('\n❌ Fill in GMAIL_USER and GMAIL_APP_PASSWORD in .env.local first.\n');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

const from = GMAIL_FROM || GMAIL_USER;
const to = GMAIL_USER;

let passed = 0;
let failed = 0;

function ok(label) { console.log(`  ✅ ${label}`); passed++; }
function fail(label, err) {
  console.log(`  ❌ ${label}`);
  console.log(`     ${err?.message || err}`);
  failed++;
}

// ── Test 1: Payment confirmation + invoice ───────────────────────────────────
console.log('\n📧 Test 1 — Payment confirmation + invoice...');
try {
  await transporter.sendMail({
    from, to,
    subject: 'Appointment Confirmed — Invoice INV-202604-TEST01',
    html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:28px 32px;color:#fff">
    <h1 style="margin:0;font-size:22px">Appointment Confirmed ✓</h1>
    <p style="margin:6px 0 0;opacity:.85;font-size:14px">Payment received — see your invoice below</p>
  </div>
  <div style="padding:28px 32px 0">
    <p style="margin:0 0 24px;color:#374151">Hi <strong>Test Patient</strong>, your booking is confirmed and payment has been received.</p>
  </div>
  <div style="padding:0 32px 24px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;width:40%">Date</td><td style="padding:10px 0;color:#111827;font-weight:600">2026-04-25</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280">Time</td><td style="padding:10px 0;color:#111827;font-weight:600">10:00 AM</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280">Type</td><td style="padding:10px 0;color:#111827;font-weight:600">General Consultation</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280">Mode</td><td style="padding:10px 0;color:#111827;font-weight:600">Video</td></tr>
    </table>
  </div>
  <div style="margin:0 32px 28px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="background:#f9fafb;padding:14px 18px;border-bottom:1px solid #e5e7eb"><span style="font-weight:700;color:#111827">Invoice INV-202604-TEST01</span></div>
    <div style="padding:16px 18px"><table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">Service</td><td style="padding:8px 0;color:#374151;text-align:right">General Consultation — Video</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">Payment Method</td><td style="padding:8px 0;color:#374151;text-align:right">Card (Stripe)</td></tr>
      <tr><td style="padding:10px 0;color:#111827;font-weight:700">Total Paid</td><td style="padding:10px 0;color:#0d9488;font-weight:700;font-size:16px;text-align:right">USD 165.00</td></tr>
    </table></div>
  </div>
  <div style="padding:0 32px 28px">
    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:14px 16px">
      <p style="margin:0;color:#0f766e;font-size:13px">📹 This is a <strong>Video consultation</strong>. You will receive a meeting link <strong>15 minutes before</strong> your appointment.</p>
    </div>
    <div style="margin-top:24px;text-align:center">
      <a href="${NEXT_PUBLIC_APP_URL}/dashboard/appointments" style="background:#0d9488;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">View My Appointment</a>
    </div>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center">Dr. Carter Medical Clinic · Questions? Reply to this email</div>
</div></body></html>`,
  });
  ok(`Confirmation + invoice sent to ${to}`);
} catch (err) {
  fail('Confirmation email failed', err);
}

// ── Test 2: 24-hour reminder ─────────────────────────────────────────────────
console.log('\n📧 Test 2 — 24-hour reminder...');
try {
  await transporter.sendMail({
    from, to,
    subject: 'Reminder: Appointment Tomorrow — Dr. Carter',
    html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;color:#fff">
    <h1 style="margin:0;font-size:22px">⏰ Appointment Tomorrow</h1>
    <p style="margin:6px 0 0;opacity:.85;font-size:14px">24-hour reminder</p>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 20px;color:#374151">Hi <strong>Test Patient</strong>, your appointment is tomorrow.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;width:40%">Date</td><td style="padding:10px 0;color:#111827;font-weight:600">2026-04-25</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280">Time</td><td style="padding:10px 0;color:#111827;font-weight:600">10:00 AM</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280">Type</td><td style="padding:10px 0;color:#111827;font-weight:600">General Consultation</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280">Mode</td><td style="padding:10px 0;color:#111827;font-weight:600">Video</td></tr>
    </table>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-top:20px">
      <p style="margin:0;color:#1d4ed8;font-size:13px">📹 You will receive your <strong>meeting link 15 minutes before</strong> the appointment.</p>
    </div>
    <div style="margin-top:28px;text-align:center">
      <a href="${NEXT_PUBLIC_APP_URL}/dashboard/appointments" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">View Appointment</a>
    </div>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center">Dr. Carter Medical Clinic</div>
</div></body></html>`,
  });
  ok(`24h reminder sent to ${to}`);
} catch (err) {
  fail('24h reminder email failed', err);
}

// ── Test 3: 15-minute notification ───────────────────────────────────────────
console.log('\n📧 Test 3 — 15-minute notification...');
try {
  await transporter.sendMail({
    from, to,
    subject: 'Your Appointment Starts in 15 Minutes',
    html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;color:#fff">
    <h1 style="margin:0;font-size:22px">🚀 Your Appointment Starts in 15 Minutes</h1>
    <p style="margin:6px 0 0;opacity:.85;font-size:14px">Get ready — it starts soon!</p>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 20px;color:#374151">Hi <strong>Test Patient</strong>, your appointment is in <strong>15 minutes</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;width:40%">Date</td><td style="padding:10px 0;color:#111827;font-weight:600">2026-04-25</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280">Time</td><td style="padding:10px 0;color:#111827;font-weight:600">10:00 AM</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280">Type</td><td style="padding:10px 0;color:#111827;font-weight:600">General Consultation</td></tr>
    </table>
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:18px 20px;margin-top:20px">
      <p style="margin:0 0 10px;color:#7c3aed;font-weight:700;font-size:15px">📹 Video Consultation</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151">Session Code: <strong style="font-size:20px;letter-spacing:4px;color:#6d28d9">ABC123</strong></p>
      <a href="${NEXT_PUBLIC_APP_URL}/consult" style="display:inline-block;margin-top:10px;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 22px;border-radius:7px;font-weight:600;font-size:14px">Join Video Call</a>
    </div>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center">Dr. Carter Medical Clinic</div>
</div></body></html>`,
  });
  ok(`15-min notification sent to ${to}`);
} catch (err) {
  fail('15-min notification email failed', err);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`  Result: ${passed} passed, ${failed} failed`);
if (failed === 0 && passed > 0) {
  console.log('  🎉 All 3 email notifications are working!\n');
} else {
  console.log('  ⚠️  Fix the errors above and re-run.\n');
}
