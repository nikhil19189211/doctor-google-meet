import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { type CurrencyCode, convertFromUSD, toStripeAmount } from '@/lib/currency';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function getFee(type: string): number {
  const t = type.toLowerCase();
  if (t.includes('follow')) return 80;
  if (
    t.includes('consult') || t.includes('check') || t.includes('general') ||
    t.includes('cardiac') || t.includes('specialist') || t.includes('physical') ||
    t.includes('lab') || t.includes('urgent') || t.includes('preventive')
  ) return 150;
  return 50;
}

export async function POST(req: Request) {
  try {
    const { appointment_id, currency = 'USD' } = await req.json();
    const cur = (currency as CurrencyCode) || 'USD';

    const { data: appt, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (error || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const feeUSD = getFee(appt.type);
    const taxUSD = feeUSD * 0.1;
    const totalUSD = feeUSD + taxUSD;

    const totalInCurrency = convertFromUSD(totalUSD, cur);
    const stripeAmount = toStripeAmount(totalInCurrency, cur);

    const intent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: cur.toLowerCase(),
      metadata: { appointment_id, original_usd: totalUSD.toFixed(2) },
    });

    return NextResponse.json({
      client_secret: intent.client_secret,
      amount: totalInCurrency,
      currency: cur,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
