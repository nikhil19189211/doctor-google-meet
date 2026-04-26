import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentConfirmation } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifySignature(headers: Headers, body: string): Promise<boolean> {
  try {
    const base = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const { access_token } = await tokenRes.json();

    const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_algo: headers.get('paypal-auth-algo'),
        cert_url: headers.get('paypal-cert-url'),
        transmission_id: headers.get('paypal-transmission-id'),
        transmission_sig: headers.get('paypal-transmission-sig'),
        transmission_time: headers.get('paypal-transmission-time'),
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(body),
      }),
    });

    const { verification_status } = await verifyRes.json();
    return verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.text();

  const valid = await verifySignature(req.headers, body);
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  const event = JSON.parse(body);

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const capture = event.resource;
    const appointment_id = capture.custom_id;
    const amount = parseFloat(capture.amount?.value ?? '0');

    if (appointment_id) {
      const currency = (capture.amount?.currency_code ?? 'USD').toLowerCase();
      await supabaseAdmin.from('payments').upsert(
        {
          appointment_id,
          gateway: 'paypal',
          amount,
          currency,
          status: 'paid',
          gateway_payment_id: capture.id,
          paid_at: new Date().toISOString(),
        },
        { onConflict: 'gateway_payment_id' }
      );

      firePaymentConfirmation(appointment_id, amount, currency, 'paypal').catch(console.error);
    }
  }

  return NextResponse.json({ received: true });
}

async function firePaymentConfirmation(
  appointmentId: string,
  amount: number,
  currency: string,
  gateway: string,
) {
  const { data: appt } = await supabaseAdmin
    .from('appointments')
    .select('id, date, time, type, mode, user_id')
    .eq('id', appointmentId)
    .single();

  if (!appt) return;

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(appt.user_id);
  if (!userData?.user) return;

  const user = userData.user;
  const patientName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Patient';

  await sendPaymentConfirmation({
    id: appt.id,
    date: appt.date,
    time: appt.time,
    type: appt.type,
    mode: appt.mode,
    patientName,
    patientEmail: user.email!,
    amount,
    currency,
    gateway,
  });

  await supabaseAdmin.from('notification_log').upsert(
    { appointment_id: appointmentId, type: 'confirmation' },
    { onConflict: 'appointment_id,type' }
  );
}
