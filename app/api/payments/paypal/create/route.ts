import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { type CurrencyCode, CURRENCIES, convertFromUSD } from '@/lib/currency';

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
    const { appointment_id, currency = 'USD' } = await req.json();

    // PayPal doesn't support INR; fall back to USD for Stripe-only currencies
    const rawCur = currency as CurrencyCode;
    const cur: CurrencyCode = CURRENCIES[rawCur]?.stripeOnly ? 'USD' : rawCur;

    const { data: appt } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const feeUSD = getFee(appt.type);
    const taxUSD = feeUSD * 0.1;
    const totalUSD = feeUSD + taxUSD;

    const { zeroDecimal } = CURRENCIES[cur];
    const totalInCurrency = convertFromUSD(totalUSD, cur);
    const totalStr = zeroDecimal
      ? String(Math.round(totalInCurrency))
      : totalInCurrency.toFixed(2);

    const base = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const token = await getPayPalToken();

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: cur, value: totalStr },
          custom_id: appointment_id,
          description: `${appt.type} — ${appt.date} at ${appt.time}`,
        }],
      }),
    });

    const order = await orderRes.json();
    return NextResponse.json({ order_id: order.id, amount: parseFloat(totalStr), currency: cur });
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
