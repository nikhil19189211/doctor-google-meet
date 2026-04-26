import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentConfirmation } from '@/lib/notifications';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const appointment_id = intent.metadata.appointment_id;

    if (appointment_id) {
      await supabaseAdmin.from('payments').upsert(
        {
          appointment_id,
          gateway: 'stripe',
          amount: intent.amount / 100,
          currency: intent.currency,
          status: 'paid',
          gateway_payment_id: intent.id,
          paid_at: new Date().toISOString(),
        },
        { onConflict: 'gateway_payment_id' }
      );

      // Fire-and-forget payment confirmation notifications
      firePaymentConfirmation(appointment_id, intent.amount / 100, intent.currency, 'stripe').catch(console.error);
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
