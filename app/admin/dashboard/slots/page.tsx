"use client";

import { useState, useEffect, useCallback } from "react";

const DAYS_MAP: Record<number, { label: string; short: string }> = {
  1: { label: "Monday",    short: "Mon" },
  2: { label: "Tuesday",   short: "Tue" },
  3: { label: "Wednesday", short: "Wed" },
  4: { label: "Thursday",  short: "Thu" },
  5: { label: "Friday",    short: "Fri" },
  6: { label: "Saturday",  short: "Sat" },
  7: { label: "Sunday",    short: "Sun" },
};

const MORNING_SLOTS   = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"];
const AFTERNOON_SLOTS = ["2:00 PM", "2:30 PM", "3:00 PM",  "3:30 PM",  "4:00 PM",  "4:30 PM"];
const ALL_SLOTS       = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];

type SlotKey = string; // `${day_of_week}::${time_slot}`

type RollingDay = {
  label: string;
  short: string;
  dayOfWeek: number;  // 1=Mon … 7=Sun
  date: Date;
  weekStart: string;  // YYYY-MM-DD of that week's Monday
  isToday: boolean;
  isNextWeek: boolean;
};

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseSlotMinutes(time: string): number {
  const [timePart, period] = time.split(" ");
  const [h, mi] = timePart.split(":").map(Number);
  let hours = h;
  if (period === "PM" && h !== 12) hours += 12;
  if (period === "AM" && h === 12) hours = 0;
  return hours * 60 + mi;
}

/** Build 7 rolling days starting from today (no past days). */
function buildRollingDays(todayDate: Date): RollingDay[] {
  const start = new Date(todayDate);
  start.setHours(0, 0, 0, 0);
  const thisWeekMonday = getWeekMonday(start);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const jsDay = date.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const weekMonday = getWeekMonday(date);
    return {
      ...DAYS_MAP[dayOfWeek],
      dayOfWeek,
      date,
      weekStart: toISODate(weekMonday),
      isToday: i === 0,
      isNextWeek: weekMonday.getTime() !== thisWeekMonday.getTime(),
    };
  });
}

export default function AdminSlotsPage() {
  const [now, setNow] = useState(() => new Date());
  const [activeSlots, setActiveSlots] = useState<Set<SlotKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Tick every minute so isSlotPast updates live
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Compute rolling days from today
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);
  const todayISO = toISODate(todayDate);
  const rollingDays = buildRollingDays(todayDate);
  const uniqueWeeks = [...new Set(rollingDays.map((d) => d.weekStart))];
  const nextWeekStartIndex = rollingDays.findIndex((d) => d.isNextWeek);
  const rotatedCount = nextWeekStartIndex >= 0 ? 7 - nextWeekStartIndex : 0;

  // Fetch slots whenever date rolls over (new day)
  useEffect(() => {
    setLoading(true);
    setDirty(false);

    const days = buildRollingDays(new Date(todayISO));
    const weeks = [...new Set(days.map((d) => d.weekStart))];

    Promise.all(weeks.map((w) => fetch(`/api/admin/slots?week=${w}`).then((r) => r.json())))
      .then((results) => {
        const active = new Set<SlotKey>();
        const nextWeekDaysWithRecords = new Set<number>();

        results.forEach(({ slots }) => {
          (slots ?? []).forEach(
            (s: { day_of_week: number; time_slot: string; is_active: boolean; week_start_date: string }) => {
              const rollingDay = days.find(
                (d) => d.weekStart === s.week_start_date && d.dayOfWeek === s.day_of_week
              );
              if (!rollingDay) return;
              if (s.is_active) active.add(`${s.day_of_week}::${s.time_slot}`);
              if (rollingDay.isNextWeek) nextWeekDaysWithRecords.add(s.day_of_week);
            }
          );
        });

        // Auto-activate all slots for next-week days that have no existing DB records
        days
          .filter((d) => d.isNextWeek && !nextWeekDaysWithRecords.has(d.dayOfWeek))
          .forEach((d) => {
            ALL_SLOTS.forEach((t) => active.add(`${d.dayOfWeek}::${t}`));
          });

        setActiveSlots(active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayISO]);

  // ── Slot helpers ─────────────────────────────────────────────────────────

  function isSlotPast(day: RollingDay, time: string): boolean {
    if (!day.isToday) return false;
    const slotMinutes = parseSlotMinutes(time);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= nowMinutes;
  }

  function formatDayDate(day: RollingDay): string {
    return day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // ── Toggles ───────────────────────────────────────────────────────────────

  function toggle(day: RollingDay, time: string) {
    if (isSlotPast(day, time)) return;
    const key = `${day.dayOfWeek}::${time}`;
    setActiveSlots((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setDirty(true);
    setSaved(false);
  }

  function toggleDay(day: RollingDay) {
    const futureKeys = ALL_SLOTS.filter((t) => !isSlotPast(day, t)).map((t) => `${day.dayOfWeek}::${t}`);
    if (!futureKeys.length) return;
    const allActive = futureKeys.every((k) => activeSlots.has(k));
    setActiveSlots((prev) => {
      const next = new Set(prev);
      futureKeys.forEach((k) => (allActive ? next.delete(k) : next.add(k)));
      return next;
    });
    setDirty(true);
    setSaved(false);
  }

  function toggleAll() {
    const futureKeys = rollingDays.flatMap((d) =>
      ALL_SLOTS.filter((t) => !isSlotPast(d, t)).map((t) => `${d.dayOfWeek}::${t}`)
    );
    const allActive = futureKeys.every((k) => activeSlots.has(k));
    setActiveSlots((prev) => {
      const next = new Set(prev);
      futureKeys.forEach((k) => (allActive ? next.delete(k) : next.add(k)));
      return next;
    });
    setDirty(true);
    setSaved(false);
  }

  const save = useCallback(async () => {
    setSaving(true);
    const days = buildRollingDays(new Date(todayISO));

    // Group slots by week_start_date for separate API calls
    const byWeek = new Map<
      string,
      Array<{ week_start_date: string; day_of_week: number; time_slot: string; is_active: boolean }>
    >();
    days.forEach((day) => {
      if (!byWeek.has(day.weekStart)) byWeek.set(day.weekStart, []);
      ALL_SLOTS.forEach((t) => {
        byWeek.get(day.weekStart)!.push({
          week_start_date: day.weekStart,
          day_of_week: day.dayOfWeek,
          time_slot: t,
          is_active: activeSlots.has(`${day.dayOfWeek}::${t}`),
        });
      });
    });

    try {
      await Promise.all(
        [...byWeek.values()].map((slots) =>
          fetch("/api/admin/slots", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slots }),
          })
        )
      );
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [activeSlots, todayISO]);

  const totalActive = rollingDays.reduce(
    (sum, d) => sum + ALL_SLOTS.filter((t) => activeSlots.has(`${d.dayOfWeek}::${t}`)).length,
    0
  );
  const totalPossible = 7 * ALL_SLOTS.length;

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Time Slot Manager</h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure slots for the next 7 days. Past days auto-rotate to next week with all slots open.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">{dateStr} · {timeStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </div>
          )}
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rolling window info bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Rolling 7-Day View</p>
            <p className="text-xs text-slate-500">
              {rollingDays[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" – "}
              {rollingDays[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {uniqueWeeks.length > 1 && " · spans 2 weeks"}
            </p>
          </div>
        </div>
        {rotatedCount > 0 && (
          <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-1.5 flex-shrink-0">
            ↩ {rotatedCount} day{rotatedCount !== 1 ? "s" : ""} rotated to next week
          </span>
        )}
      </div>

      {/* Summary bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-300">7-day availability</span>
            <span className="text-sm font-bold text-blue-400">{totalActive} / {totalPossible} slots open</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: totalPossible > 0 ? `${(totalActive / totalPossible) * 100}%` : "0%" }}
            />
          </div>
        </div>
        <div className="flex gap-2 sm:flex-shrink-0 items-center">
          <button
            onClick={toggleAll}
            className="text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 hover:bg-slate-700 transition-colors"
          >
            {(() => {
              const futureKeys = rollingDays.flatMap((d) =>
                ALL_SLOTS.filter((t) => !isSlotPast(d, t)).map((t) => `${d.dayOfWeek}::${t}`)
              );
              return futureKeys.every((k) => activeSlots.has(k)) ? "Clear All" : "Select All";
            })()}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-600 text-sm">Loading slots…</div>
      ) : (
        <div className="space-y-6">
          {rollingDays.map((day, index) => {
            const dayKeys = ALL_SLOTS.map((t) => `${day.dayOfWeek}::${t}`);
            const dayActive = dayKeys.filter((k) => activeSlots.has(k)).length;
            const futureKeys = ALL_SLOTS.filter((t) => !isSlotPast(day, t)).map((t) => `${day.dayOfWeek}::${t}`);
            const allFutureActive = futureKeys.length > 0 && futureKeys.every((k) => activeSlots.has(k));

            return (
              <div key={`${day.weekStart}-${day.dayOfWeek}`}>

                {/* Next-week section divider */}
                {day.isNextWeek && index === nextWeekStartIndex && (
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-px bg-slate-800" />
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full whitespace-nowrap">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Rotated to Next Week · All slots pre-opened
                    </div>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                )}

                <div className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                  day.isNextWeek
                    ? "border-purple-800/40 ring-1 ring-purple-700/20"
                    : "border-slate-800"
                }`}>
                  {/* Day header */}
                  <div className={`flex items-center justify-between px-5 py-4 border-b ${
                    day.isNextWeek ? "border-purple-800/30 bg-purple-900/10" : "border-slate-800"
                  }`}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleDay(day)}
                        disabled={futureKeys.length === 0}
                        className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                          futureKeys.length === 0
                            ? "cursor-not-allowed opacity-40 bg-slate-700"
                            : allFutureActive
                            ? "bg-blue-600"
                            : futureKeys.some((k) => activeSlots.has(k))
                            ? "bg-blue-900"
                            : "bg-slate-700"
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                          allFutureActive ? "left-5" : "left-1"
                        }`} />
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm">{day.label}</p>
                          <span className="text-xs text-slate-500">{formatDayDate(day)}</span>
                          {day.isToday && (
                            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                          {day.isNextWeek && (
                            <span className="text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25 px-1.5 py-0.5 rounded-full">
                              Next Week
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{dayActive} of {ALL_SLOTS.length} slots open</p>
                      </div>
                    </div>

                    <div className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      allFutureActive && futureKeys.length === ALL_SLOTS.length
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : dayActive > 0
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-slate-700/60 text-slate-500 border-slate-600/40"
                    }`}>
                      {allFutureActive && futureKeys.length === ALL_SLOTS.length
                        ? "Full Day"
                        : dayActive > 0
                        ? "Partial"
                        : "Closed"}
                    </div>
                  </div>

                  {/* Slots grid */}
                  <div className="p-5 space-y-4">
                    {([["Morning", MORNING_SLOTS], ["Afternoon", AFTERNOON_SLOTS]] as [string, string[]][]).map(
                      ([sectionLabel, slots]) => (
                        <div key={sectionLabel}>
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">
                            {sectionLabel}
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {slots.map((time) => {
                              const key = `${day.dayOfWeek}::${time}`;
                              const active = activeSlots.has(key);
                              const slotPast = isSlotPast(day, time);
                              return (
                                <button
                                  key={time}
                                  onClick={() => toggle(day, time)}
                                  disabled={slotPast}
                                  title={slotPast ? "This slot has already passed" : undefined}
                                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all relative ${
                                    slotPast
                                      ? "bg-slate-800/50 text-slate-700 border-slate-800 cursor-not-allowed line-through"
                                      : active
                                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-900/30"
                                      : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300"
                                  }`}
                                >
                                  {time}
                                  {slotPast && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-slate-700 rounded-full flex items-center justify-center">
                                      <svg className="w-2 h-2 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                                      </svg>
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dirty && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-2xl px-6 py-3.5 shadow-2xl shadow-blue-900/50 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
