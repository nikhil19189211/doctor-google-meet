'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type User = { id: string; email?: string; user_metadata?: { full_name?: string } };

const APPOINTMENT_TYPES = [
  { value: 'General Consultation',   icon: '🩺', desc: 'General health check-up'     },
  { value: 'Cardiac Check-up',       icon: '❤️',  desc: 'Heart health evaluation'     },
  { value: 'Follow-up Consultation', icon: '📋', desc: 'Previous visit follow-up'    },
  { value: 'Routine Physical',       icon: '⚕️',  desc: 'Annual physical exam'        },
  { value: 'Lab Review',             icon: '🔬', desc: 'Review your test results'    },
  { value: 'Specialist Referral',    icon: '👨‍⚕️', desc: 'Specialist consultation'    },
  { value: 'Urgent Care',            icon: '🚨', desc: 'Immediate medical attention' },
  { value: 'Preventive Screening',   icon: '🛡️',  desc: 'Preventive health screening' },
];

const MORNING_SLOTS   = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'];
const AFTERNOON_SLOTS = ['2:00 PM', '2:30 PM', '3:00 PM',  '3:30 PM',  '4:00 PM',  '4:30 PM'];

/** Returns the ISO date string (YYYY-MM-DD) of the Monday of the week containing dateStr. */
function getWeekMondayISO(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseSlotMinutes(time: string): number {
  const [timePart, period] = time.split(' ');
  const [h, m] = timePart.split(':').map(Number);
  let hours = h;
  if (period === 'PM' && h !== 12) hours += 12;
  if (period === 'AM' && h === 12) hours = 0;
  return hours * 60 + m;
}

// ─── Inline SVG icons ─────────────────────────────────────────
function IconCal() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M12 22s-8-4.5-8-11a8 8 0 0116 0c0 6.5-8 11-8 11z" /><circle cx="12" cy="11" r="3" />
    </svg>
  );
}

// ─── Slot pill ────────────────────────────────────────────────
function SlotPill({
  time, booked, selected, isPast, onClick,
}: {
  time: string; booked: boolean; selected: boolean; isPast: boolean; onClick: () => void;
}) {
  if (isPast) {
    return (
      <div className="relative flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 px-2 py-3 cursor-not-allowed select-none">
        <span className="text-xs font-medium text-gray-300 line-through leading-none">{time}</span>
        <span className="mt-1 text-[10px] font-semibold text-gray-400 leading-none">Passed</span>
      </div>
    );
  }
  if (booked) {
    return (
      <div className="relative flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 px-2 py-3 cursor-not-allowed select-none">
        <span className="text-xs font-medium text-gray-300 line-through leading-none">{time}</span>
        <span className="mt-1 text-[10px] font-semibold text-red-400 leading-none">Booked</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center rounded-xl border-2 px-2 py-3 text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1
        ${selected
          ? 'border-teal-500 bg-teal-500 text-white shadow-md shadow-teal-200 scale-[1.03]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700'
        }`}
    >
      {selected && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none border border-white">
          ✓
        </span>
      )}
      {time}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function BookPage() {
  const router = useRouter();
  const [user, setUser]               = useState<User | null>(null);
  const [appointmentType, setType]    = useState('');
  const [selectedDate, setDate]       = useState('');
  const [selectedTime, setTime]       = useState('');
  const [bookedSlots, setBookedSlots]   = useState<string[]>([]);
  const [activeSlots, setActiveSlots]   = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
      else setUser(data.user as User);
    });
  }, [router]);

  // Load + real-time subscribe to booked slots for chosen date
  useEffect(() => {
    if (!selectedDate) { setBookedSlots([]); return; }

    setLoadingSlots(true);
    setTime('');
    let cancelled = false;

    // JS getDay(): 0=Sun,1=Mon...6=Sat → DB day_of_week: 1=Mon...7=Sun
    const jsDay = new Date(selectedDate + 'T00:00:00').getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const weekStartDate = getWeekMondayISO(selectedDate);

    (async () => {
      const [bookedRes, allSlotsRes, activeSlotsRes] = await Promise.all([
        supabase.from('booked_slots').select('time').eq('date', selectedDate),
        // Check if the doctor has configured this week at all
        supabase
          .from('available_slots')
          .select('id', { count: 'exact', head: true })
          .eq('week_start_date', weekStartDate)
          .eq('day_of_week', dayOfWeek),
        supabase
          .from('available_slots')
          .select('time_slot')
          .eq('week_start_date', weekStartDate)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true),
      ]);
      if (!cancelled) {
        setBookedSlots(bookedRes.data?.map((r: { time: string }) => r.time) ?? []);
        // If no records exist for this week+day, default to all slots active
        // (mirrors admin panel behaviour where unconfigured weeks show all slots)
        const noSetupYet = (allSlotsRes.count ?? 0) === 0;
        const ALL_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];
        setActiveSlots(
          noSetupYet
            ? ALL_SLOTS
            : (activeSlotsRes.data?.map((r: { time_slot: string }) => r.time_slot) ?? [])
        );
        setLoadingSlots(false);
      }
    })();

    const channel = supabase
      .channel(`slots_${selectedDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booked_slots', filter: `date=eq.${selectedDate}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = (payload.new as { time: string }).time;
            setBookedSlots((prev) => [...new Set([...prev, t])]);
            setTime((prev) => (prev === t ? '' : prev));
          } else if (payload.eventType === 'DELETE') {
            const t = (payload.old as { time: string }).time;
            setBookedSlots((prev) => prev.filter((s) => s !== t));
          }
        }
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [selectedDate]);

  const handleSubmit = async () => {
    if (!user || !appointmentType || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError('');

    try {
      // Race-condition guard: verify slot is still free
      const { data: taken } = await supabase
        .from('booked_slots')
        .select('id')
        .eq('date', selectedDate)
        .eq('time', selectedTime)
        .maybeSingle();

      if (taken) {
        setError('This slot was just taken. Please choose a different time.');
        setTime('');
        return;
      }

      // If this user already has a pending appointment for the same slot, go to that payment page
      const { data: existingPending } = await supabase
        .from('appointments')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .eq('time', selectedTime)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingPending) {
        router.push(`/book/pay/${existingPending.id}`);
        return;
      }

      const { data: appt, error: apptErr } = await supabase
        .from('appointments')
        .insert({ user_id: user.id, date: selectedDate, time: selectedTime, type: appointmentType, mode: 'In-Person', status: 'pending' })
        .select()
        .single();
      if (apptErr) throw apptErr;

      // Slot is locked only after payment is completed — do NOT insert into booked_slots here.
      router.push(`/book/pay/${appt.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })();
  const isFormValid = !!(appointmentType && selectedDate && selectedTime) && !submitting;

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isToday = selectedDate === today;

  function isSlotPastToday(time: string): boolean {
    if (!isToday) return false;
    return parseSlotMinutes(time) <= nowMinutes;
  }

  const activeMorning   = MORNING_SLOTS.filter((t) => activeSlots.includes(t));
  const activeAfternoon = AFTERNOON_SLOTS.filter((t) => activeSlots.includes(t));
  const morningFree   = activeMorning.filter((t) => !bookedSlots.includes(t) && !isSlotPastToday(t)).length;
  const afternoonFree = activeAfternoon.filter((t) => !bookedSlots.includes(t) && !isSlotPastToday(t)).length;

  const fmtDate = (d: string) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Dashboard
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm font-medium text-gray-700">Book Appointment</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── LEFT: form ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Book an Appointment</h1>
              <p className="mt-1 text-gray-500">Schedule your visit with Dr. Amelia Carter in a few steps.</p>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Step 1 — Appointment Type */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-7 h-7 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                <h2 className="text-base font-semibold text-gray-900">Appointment Type</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {APPOINTMENT_TYPES.map((apt) => (
                  <button
                    key={apt.value}
                    type="button"
                    onClick={() => setType(apt.value)}
                    className={`relative flex flex-col items-center text-center rounded-xl border-2 p-4 gap-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1
                      ${appointmentType === apt.value
                        ? 'border-teal-500 bg-teal-50 shadow-sm'
                        : 'border-gray-100 bg-gray-50/60 hover:border-teal-200 hover:bg-teal-50/50'
                      }`}
                  >
                    {appointmentType === apt.value && (
                      <span className="absolute top-2 right-2 text-teal-500"><IconCheck /></span>
                    )}
                    <span className="text-2xl leading-none">{apt.icon}</span>
                    <span className={`text-xs font-semibold leading-tight ${appointmentType === apt.value ? 'text-teal-700' : 'text-gray-700'}`}>
                      {apt.value}
                    </span>
                    <span className="text-[10px] text-gray-400 leading-tight">{apt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Date */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-7 h-7 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                <h2 className="text-base font-semibold text-gray-900">Select Date</h2>
              </div>
              <div className="relative max-w-xs">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400"><IconCal /></span>
                <input
                  type="date"
                  min={today}
                  max={maxDate}
                  value={selectedDate}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:outline-none text-gray-800 bg-white text-sm font-medium transition-colors"
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">Appointments available within the next 7 days only.</p>
              {selectedDate && (
                <p className="mt-2.5 text-sm text-teal-600 font-medium flex items-center gap-1.5">
                  <IconCal /> {fmtDate(selectedDate)}
                </p>
              )}
            </div>

            {/* Step 3 — Time slot */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-7 h-7 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                <h2 className="text-base font-semibold text-gray-900">Choose Time Slot</h2>
                {selectedDate && !loadingSlots && (
                  <span className="ml-auto text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
                    {morningFree + afternoonFree} available
                  </span>
                )}
              </div>

              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-300 gap-3">
                  <IconCal />
                  <p className="text-sm">Select a date above to see available slots</p>
                </div>
              ) : loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
                  <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Loading slots…</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeMorning.length === 0 && activeAfternoon.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                      <span className="text-3xl">🗓️</span>
                      <p className="text-sm font-medium">No slots available for this day</p>
                      <p className="text-xs text-gray-300">The doctor has not scheduled any appointments on this date.</p>
                    </div>
                  ) : (
                    <>
                  {/* Morning */}
                  {activeMorning.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-gray-700">🌅 Morning</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${morningFree > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        {morningFree}/{activeMorning.length} free
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {activeMorning.map((t) => (
                        <SlotPill key={t} time={t} booked={bookedSlots.includes(t)} selected={selectedTime === t} isPast={isSlotPastToday(t)} onClick={() => { if (!isSlotPastToday(t)) setTime(t); }} />
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Afternoon */}
                  {activeAfternoon.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-gray-700">☀️ Afternoon</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${afternoonFree > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        {afternoonFree}/{activeAfternoon.length} free
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {activeAfternoon.map((t) => (
                        <SlotPill key={t} time={t} booked={bookedSlots.includes(t)} selected={selectedTime === t} isPast={isSlotPastToday(t)} onClick={() => { if (!isSlotPastToday(t)) setTime(t); }} />
                      ))}
                    </div>
                  </div>
                  )}
                    </>
                  )}

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="inline-block w-3 h-3 rounded border-2 border-gray-200 bg-white" />Available
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="inline-block w-3 h-3 rounded border-2 border-teal-500 bg-teal-500" />Selected
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="inline-block w-3 h-3 rounded border-2 border-gray-100 bg-gray-50" />Booked
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 text-[11px] text-teal-500 font-medium">
                      <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                      Live availability
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className={`w-full py-4 rounded-2xl text-base font-bold tracking-wide transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-teal-300
                ${isFormValid && !submitting
                  ? 'bg-teal-500 hover:bg-teal-600 active:scale-[0.98] text-white shadow-lg shadow-teal-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirming…
                </span>
              ) : (
                'Confirm & Proceed to Payment'
              )}
            </button>
          </div>

          {/* ── RIGHT: sidebar ──────────────────────────────── */}
          <div className="space-y-5 lg:sticky lg:top-24">

            {/* Doctor card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-100">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Dr. Amelia Carter</h3>
              <p className="text-sm text-teal-600 font-semibold">MD, FACC</p>
              <p className="text-xs text-gray-400 mb-4">Cardiologist · Board Certified</p>
              <div className="flex items-center justify-center gap-0.5 mb-4">
                {[1,2,3,4,5].map((i) => (
                  <svg key={i} className="w-4 h-4 fill-amber-400" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
                <span className="text-xs text-gray-400 ml-1.5">4.9 (287)</span>
              </div>
              <div className="space-y-2 text-left text-xs text-gray-500">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <IconPin /><span>123 Medical Center Dr, Suite 400</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <IconClock /><span>Mon–Fri · 9:00 AM – 5:00 PM</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Booking Summary</h3>
              <ul className="space-y-3.5">
                {[
                  { icon: <span className="text-base">📋</span>, label: 'Type',   val: appointmentType || '—' },
                  { icon: <IconCal />,   label: 'Date',   val: fmtDate(selectedDate) },
                  { icon: <IconClock />, label: 'Time',   val: selectedTime || '—'   },
                ].map(({ icon, label, val }) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="text-gray-400 flex-shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-bold text-gray-400">{label}</p>
                      <p className={`text-sm font-semibold leading-tight ${val === '—' ? 'text-gray-300' : 'text-gray-800'}`}>{val}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {isFormValid && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2.5 text-center font-medium">
                  ✓ All set — ready to confirm!
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">Good to know</p>
              <ul className="space-y-1.5 text-xs text-teal-600">
                <li>• Slots update live — no double-bookings</li>
                <li>• Bring your insurance card &amp; photo ID</li>
                <li>• Reschedule anytime from your dashboard</li>
                <li>• Confirmation sent to your email</li>
              </ul>
            </div>

            {/* Patient chip */}
            {user && (
              <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-gray-500">
                  <IconUser />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Booking as</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user.user_metadata?.full_name ?? user.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
