import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentConfirmation } from '@/lib/email';

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
      // Record payment
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
      await fireConfirmation(appointment_id, intent.amount / 100, intent.currency, 'stripe', intent.id);
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
