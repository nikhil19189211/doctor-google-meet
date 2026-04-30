import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentConfirmation } from '@/lib/email';

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

      // Record payment
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

      // Mark appointment confirmed
      await supabaseAdmin
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointment_id);

      // Lock the slot now that payment is complete
      const { data: apptSlot } = await supabaseAdmin
        .from('appointments')
        .select('date, time')
        .eq('id', appointment_id)
        .single();

      if (apptSlot) {
        const { error: slotErr } = await supabaseAdmin
          .from('booked_slots')
          .insert({ appointment_id, date: apptSlot.date, time: apptSlot.time });
        if (slotErr) console.error('[slot] booked_slots insert failed:', slotErr.message);

        // Cancel any other pending appointments for this slot (ghost bookings from abandoned payment attempts)
        await supabaseAdmin
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('date', apptSlot.date)
          .eq('time', apptSlot.time)
          .eq('status', 'pending')
          .neq('id', appointment_id);
      }

      // Send confirmation email
      await fireConfirmation(appointment_id, amount, currency, 'paypal', capture.id);
    }
  }

  return NextResponse.json({ received: true });
}

async function fireConfirmation(
  appointmentId: string,
  amount: number,
  currency: string,
  gateway: string,
  gatewayPaymentId: string,
) {
  const { data: alreadySent } = await supabaseAdmin
    .from('notification_log')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('type', 'confirmation')
    .maybeSingle();

  if (alreadySent) {
    console.log('[email] confirmation already sent for', appointmentId);
    return;
  }

  const { data: appt } = await supabaseAdmin
    .from('appointments')
    .select('id, date, time, type, mode, user_id')
    .eq('id', appointmentId)
    .single();

  if (!appt) {
    console.error('[email] appointment not found:', appointmentId);
    return;
  }

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(appt.user_id);
  if (!userData?.user?.email) {
    console.error('[email] no email for user:', appt.user_id);
    return;
  }

  const user = userData.user;
  const patientEmail = user.email!;
  const patientName =
    (user.user_metadata?.full_name as string | undefined) ?? patientEmail.split('@')[0];

  try {
    await sendPaymentConfirmation({
      patientName,
      patientEmail,
      appointmentId: appt.id,
      date: appt.date,
      time: appt.time,
      type: appt.type,
      mode: appt.mode,
      amount,
      currency,
      gateway,
      gatewayPaymentId,
    });
    console.log('[email] confirmation sent to', patientEmail);
  } catch (err) {
    console.error('[email] sendPaymentConfirmation failed:', err);
    return;
  }

  await supabaseAdmin
    .from('notification_log')
    .insert({ appointment_id: appointmentId, type: 'confirmation' });
}
