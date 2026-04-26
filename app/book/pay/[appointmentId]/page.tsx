'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';
import {
  type CurrencyCode,
  CURRENCIES,
  PAYPAL_CURRENCIES,
  convertFromUSD,
  formatAmount,
  toStripeAmount,
  detectDefaultCurrency,
} from '@/lib/currency';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type Appointment = {
  id: string;
  date: string;
  time: string;
  type: string;
  mode: string;
  status: string;
};

function getFeeUSD(type: string): number {
  const t = type.toLowerCase();
  if (t.includes('follow')) return 80;
  if (
    t.includes('consult') || t.includes('check') || t.includes('general') ||
    t.includes('cardiac') || t.includes('specialist') || t.includes('physical') ||
    t.includes('lab') || t.includes('urgent') || t.includes('preventive')
  ) return 150;
  return 50;
}

// ─── Currency Selector ────────────────────────────────────────
function CurrencySelector({
  value,
  onChange,
}: {
  value: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" strokeLinecap="round" />
      </svg>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CurrencyCode)}
        className="text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
      >
        {(Object.entries(CURRENCIES) as [CurrencyCode, typeof CURRENCIES[CurrencyCode]][]).map(
          ([code, info]) => (
            <option key={code} value={code}>
              {code} — {info.name}
            </option>
          )
        )}
      </select>
      <span className="text-xs text-gray-400">All prices shown in {value}</span>
    </div>
  );
}

// ─── Stripe Card Form ─────────────────────────────────────────
function StripeForm({
  clientSecret,
  total,
  currency,
  onSuccess,
}: {
  clientSecret: string;
  total: number;
  currency: CurrencyCode;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [cardError, setCardError] = useState('');

  const handlePay = async () => {
    if (!stripe || !elements || !clientSecret) return;
    setPaying(true);
    setCardError('');

    const card = elements.getElement(CardElement);
    if (!card) { setPaying(false); return; }

    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (error) {
      setCardError(error.message ?? 'Payment failed. Please try again.');
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Card Details
        </label>
        <div className="rounded-xl border-2 border-gray-200 px-4 py-3.5 bg-white focus-within:border-teal-400 transition-colors">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '15px',
                  color: '#1f2937',
                  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                  '::placeholder': { color: '#9ca3af' },
                },
                invalid: { color: '#ef4444' },
              },
            }}
          />
        </div>
      </div>

      {cardError && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {cardError}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={paying || !clientSecret || !stripe}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-teal-300
          ${paying || !clientSecret || !stripe
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-teal-500 hover:bg-teal-600 active:scale-[0.98] text-white shadow-lg shadow-teal-200'
          }`}
      >
        {paying ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing…
          </span>
        ) : (
          `Pay ${formatAmount(total, currency)}`
        )}
      </button>

      <div className="flex items-center justify-center gap-4 pt-1">
        {['Visa', 'Mastercard', 'Amex', 'UnionPay', 'JCB'].map((brand) => (
          <span key={brand} className="text-[10px] font-bold uppercase tracking-widest text-gray-300 border border-gray-100 rounded px-2 py-1">
            {brand}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Google Pay / Apple Pay ───────────────────────────────────
function GoogleApplePayButton({
  total,
  currency,
  clientSecret,
  onSuccess,
}: {
  total: number;
  currency: CurrencyCode;
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!stripe || !clientSecret || total <= 0) return;

    const merchantCountry = process.env.NEXT_PUBLIC_STRIPE_COUNTRY || 'US';

    const pr = stripe.paymentRequest({
      country: merchantCountry,
      currency: currency.toLowerCase(),
      total: {
        label: 'Medical Consultation',
        amount: toStripeAmount(total, currency),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      setAvailable(!!result);
      if (result) setPaymentRequest(pr);
    });

    pr.on('paymentmethod', async (ev) => {
      const { error } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );
      if (error) {
        ev.complete('fail');
      } else {
        ev.complete('success');
        onSuccessRef.current();
      }
    });

    return () => { pr.off('paymentmethod'); };
  }, [stripe, clientSecret, total, currency]);

  if (available === null) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!available) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-8 text-center space-y-2">
        <p className="text-sm font-semibold text-gray-600">Not available on this device</p>
        <p className="text-xs text-gray-400">
          Google Pay requires Chrome or Android. Apple Pay requires Safari on Apple devices.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">
        Pay instantly with your saved wallet — no card details needed.
      </p>
      {paymentRequest && (
        <PaymentRequestButtonElement
          options={{
            paymentRequest,
            style: {
              paymentRequestButton: {
                type: 'default',
                theme: 'dark',
                height: '52px',
              },
            },
          }}
        />
      )}
      <p className="text-[10px] text-gray-400 text-center">
        Secured by Stripe · 256-bit SSL
      </p>
    </div>
  );
}

// ─── PayPal Buttons ───────────────────────────────────────────
function PayPalButtons({
  appointmentId,
  currency,
  onSuccess,
  onError,
}: {
  appointmentId: string;
  currency: CurrencyCode;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  // Use USD for PayPal when the selected currency is Stripe-only (e.g. INR)
  const paypalCurrency: CurrencyCode = CURRENCIES[currency]?.stripeOnly ? 'USD' : currency;

  const renderButtons = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!containerRef.current || !win.paypal) return;
    containerRef.current.innerHTML = '';
    win.paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 },
      createOrder: async () => {
        const res = await fetch('/api/payments/paypal/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointment_id: appointmentId, currency: paypalCurrency }),
        });
        const data = await res.json();
        if (!data.order_id) throw new Error('Could not create order');
        return data.order_id;
      },
      onApprove: async (data: { orderID: string }) => {
        const res = await fetch('/api/payments/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: data.orderID, appointment_id: appointmentId }),
        });
        const result = await res.json();
        if (result.success) onSuccessRef.current();
        else onErrorRef.current('PayPal capture failed. Please try again.');
      },
      onError: () => onErrorRef.current('PayPal payment failed. Please try a different method.'),
    }).render(containerRef.current!);
    setSdkReady(true);
  }, [appointmentId, paypalCurrency]);

  useEffect(() => {
    setSdkReady(false);
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId || clientId === 'your_paypal_client_id_here') {
      setSdkReady(true);
      return;
    }

    // Each currency needs its own SDK load; use a currency-scoped script ID
    const scriptId = `paypal-sdk-${paypalCurrency}`;
    if (document.getElementById(scriptId)) {
      renderButtons();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    // No buyer-country restriction — allows all global PayPal accounts
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${paypalCurrency}&enable-funding=card,venmo,paylater`;
    script.onload = renderButtons;
    script.onerror = () => onErrorRef.current('Failed to load PayPal SDK.');
    document.body.appendChild(script);
  }, [renderButtons, paypalCurrency]);

  const isDemoMode = !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID === 'your_paypal_client_id_here';

  if (isDemoMode) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-4 text-center">
          <p className="text-sm font-semibold text-blue-700 mb-1">PayPal (Demo Mode)</p>
          <p className="text-xs text-blue-500">
            Add your <code className="bg-blue-100 rounded px-1">NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> to enable live PayPal payments.
          </p>
        </div>
        <button
          onClick={() => onSuccess()}
          className="w-full py-4 rounded-xl font-bold text-base bg-[#0070ba] hover:bg-[#003087] text-white transition-all duration-200 shadow-lg"
        >
          Simulate PayPal Payment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {CURRENCIES[currency]?.stripeOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          <span className="font-bold">Note: </span>
          PayPal does not support {CURRENCIES[currency].name} ({currency}). Your payment will be charged in USD.
        </div>
      )}
      {!sdkReady && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div ref={containerRef} className={sdkReady ? '' : 'hidden'} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function PayPage({ params }: { params: { appointmentId: string } }) {
  const router = useRouter();
  const { appointmentId } = params;

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'card' | 'paypal' | 'wallet'>('card');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [clientSecret, setClientSecret] = useState('');
  const [stripeTotal, setStripeTotal] = useState(0);
  const [paid, setPaid] = useState(false);
  const [paypalError, setPaypalError] = useState('');

  // Detect browser currency on mount
  useEffect(() => {
    setCurrency(detectDefaultCurrency());
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
    });

    supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()
      .then(({ data }) => {
        setAppt(data);
        setLoading(false);
      });
  }, [appointmentId, router]);

  // Refetch Stripe PaymentIntent when appointment or currency changes
  useEffect(() => {
    if (!appt) return;
    setClientSecret('');
    fetch('/api/payments/stripe/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appt.id, currency }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.client_secret) setClientSecret(d.client_secret);
        if (d.amount) setStripeTotal(d.amount);
      });
  }, [appt, currency]);

  const feeUSD = appt ? getFeeUSD(appt.type) : 0;
  const taxUSD = +(feeUSD * 0.1).toFixed(2);
  const totalUSD = feeUSD + taxUSD;

  const displayFee = convertFromUSD(feeUSD, currency);
  const displayTax = convertFromUSD(taxUSD, currency);
  const displayTotal = stripeTotal || convertFromUSD(totalUSD, currency);

  const handleSuccess = useCallback(() => {
    setPaid(true);
    setTimeout(() => router.push('/patient'), 3000);
  }, [router]);

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Payment Successful!</h2>
          <p className="text-gray-400 text-sm mb-6">Your appointment is confirmed. Redirecting…</p>
          {appt && (
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2.5 text-sm">
              {[
                { label: 'Type', value: appt.type },
                { label: 'Date', value: fmtDate(appt.date) },
                { label: 'Time', value: appt.time },
                { label: 'Amount Paid', value: formatAmount(displayTotal, currency) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-teal-500">
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            Redirecting to dashboard…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            href="/book"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm font-medium text-gray-700">Complete Payment</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" />
            </svg>
            256-bit SSL
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── LEFT: payment form ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Complete Payment</h1>
              <p className="mt-1 text-gray-500 text-sm">Choose your preferred payment method to confirm your booking.</p>
            </div>

            {/* Currency selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
              <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); setPaypalError(''); }} />
            </div>

            {/* Method selector tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => { setTab('card'); setPaypalError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-4 text-sm font-semibold transition-all
                    ${tab === 'card'
                      ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50/50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                  Card
                </button>
                <button
                  onClick={() => { setTab('wallet'); setPaypalError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-4 text-sm font-semibold transition-all
                    ${tab === 'wallet'
                      ? 'text-gray-800 border-b-2 border-gray-700 bg-gray-50/50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    <path d="M16 3H8L4 7h16l-4-4z" />
                    <circle cx="16" cy="14" r="1.5" fill="currentColor" />
                  </svg>
                  Google / Apple Pay
                </button>
                <button
                  onClick={() => { setTab('paypal'); setPaypalError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-4 text-sm font-semibold transition-all
                    ${tab === 'paypal'
                      ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 00-.607-.541c-.013.076-.026.175-.041.26-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106-.031.198H9.93c-.524 0-.968-.382-.968-.9l.005-.03.921-5.83-.006.03c.082-.518.526-.9 1.05-.9h2.19c4.298 0 7.664-1.748 8.647-6.797.033-.162.061-.317.087-.468.177-1.077.15-1.966-.634-2.825z" />
                  </svg>
                  PayPal
                </button>
              </div>

              <div className="p-6">
                {tab === 'card' && (
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret: clientSecret || undefined }}
                    key={`stripe-${currency}`}
                  >
                    <StripeForm
                      clientSecret={clientSecret}
                      total={displayTotal}
                      currency={currency}
                      onSuccess={handleSuccess}
                    />
                  </Elements>
                )}

                {tab === 'wallet' && (
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret: clientSecret || undefined }}
                    key={`wallet-${currency}`}
                  >
                    <GoogleApplePayButton
                      total={displayTotal}
                      currency={currency}
                      clientSecret={clientSecret}
                      onSuccess={handleSuccess}
                    />
                  </Elements>
                )}

                {tab === 'paypal' && (
                  <>
                    {paypalError && (
                      <div className="mb-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {paypalError}
                      </div>
                    )}
                    <PayPalButtons
                      key={`paypal-${currency}`}
                      appointmentId={appointmentId}
                      currency={currency}
                      onSuccess={handleSuccess}
                      onError={(msg) => setPaypalError(msg)}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Accepted payment badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Accepted:</span>
              {['Visa', 'Mastercard', 'Amex', 'UnionPay', 'JCB', 'PayPal', 'Apple Pay', 'Google Pay'].map((m) => (
                <span key={m} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-gray-200 rounded-lg px-2 py-1 bg-white">
                  {m}
                </span>
              ))}
              <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" />
                </svg>
                Secured & encrypted
              </span>
            </div>

            {/* Currency note */}
            <p className="text-xs text-gray-400 text-center">
              Exchange rates are approximate. Your bank may apply additional conversion fees.
            </p>
          </div>

          {/* ── RIGHT: summary sidebar ──────────────────────── */}
          <div className="space-y-5 lg:sticky lg:top-24">

            {/* Appointment summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Appointment</h3>
              {appt && (
                <div className="space-y-3">
                  {[
                    { label: 'Type', val: appt.type },
                    { label: 'Date', val: fmtDate(appt.date) },
                    { label: 'Time', val: appt.time },
                    { label: 'Mode', val: appt.mode },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fee breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Payment Summary <span className="text-teal-500 font-normal normal-case">({currency})</span>
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Consultation fee</span>
                  <span className="font-medium text-gray-800">{formatAmount(displayFee, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (10%)</span>
                  <span className="font-medium text-gray-800">{formatAmount(displayTax, currency)}</span>
                </div>
                <div className="flex justify-between font-bold pt-3 border-t border-gray-100">
                  <span className="text-gray-900">Total Due</span>
                  <span className="text-teal-600 text-lg">{formatAmount(displayTotal, currency)}</span>
                </div>
                {currency !== 'USD' && (
                  <p className="text-[10px] text-gray-400 text-right">≈ ${totalUSD.toFixed(2)} USD</p>
                )}
              </div>
            </div>

            {/* Policy */}
            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">Payment Policy</p>
              <ul className="space-y-1.5 text-xs text-teal-600">
                <li>• Full refund if cancelled 24h before</li>
                <li>• Pay by card, wallet, or PayPal</li>
                <li>• Receipt sent to your email</li>
                <li>• Your card details are never stored</li>
                <li>• {Object.keys(CURRENCIES).length} currencies accepted worldwide</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
