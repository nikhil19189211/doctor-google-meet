import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentConfirmation } from '@/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function getPayPalToken(): Promise<string> {
  const base = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const { order_id, appointment_id } = await req.json();

    const base = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const token = await getPayPalToken();

    const captureRes = await fetch(`${base}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    const capture = await captureRes.json();

    if (capture.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Capture not completed' }, { status: 400 });
    }

    const unit = capture.purchase_units?.[0];
    const captureId = unit?.payments?.captures?.[0]?.id;
    const amount = parseFloat(unit?.payments?.captures?.[0]?.amount?.value ?? '0');

    // Record payment
    await supabaseAdmin.from('payments').insert({
      appointment_id,
      gateway: 'paypal',
      amount,
      currency: 'usd',
      status: 'paid',
      gateway_payment_id: captureId,
      paid_at: new Date().toISOString(),
    });

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
    await fireConfirmation(appointment_id, amount, 'usd', 'paypal', captureId);

    return NextResponse.json({ success: true, capture_id: captureId });
  } catch (err) {
    console.error('[paypal/capture] error:', err);
    return NextResponse.json({ error: 'Capture failed' }, { status: 500 });
  }
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
