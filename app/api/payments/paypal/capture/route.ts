import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentConfirmation } from '@/lib/notifications';

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

    await supabaseAdmin.from('payments').insert({
      appointment_id,
      gateway: 'paypal',
      amount,
      currency: 'usd',
      status: 'paid',
      gateway_payment_id: captureId,
      paid_at: new Date().toISOString(),
    });

    // Fire-and-forget payment confirmation notifications
    firePaymentConfirmation(appointment_id, amount, 'usd', 'paypal').catch(console.error);

    return NextResponse.json({ success: true, capture_id: captureId });
  } catch {
    return NextResponse.json({ error: 'Capture failed' }, { status: 500 });
  }
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
  const patientPhone = user.user_metadata?.phone as string | undefined;

  await sendPaymentConfirmation({
    id: appt.id,
    date: appt.date,
    time: appt.time,
    type: appt.type,
    mode: appt.mode,
    patientName,
    patientEmail: user.email!,
    patientPhone,
    amount,
    currency,
    gateway,
  });

  await supabaseAdmin.from('notification_log').upsert(
    { appointment_id: appointmentId, type: 'confirmation' },
    { onConflict: 'appointment_id,type' }
  );
}
