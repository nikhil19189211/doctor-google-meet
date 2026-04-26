"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Appointment = {
  id: string;
  date: string;
  time: string;
  type: string;
  mode: string;
  status: string;
  created_at: string;
};

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-teal-100 text-teal-700",
    pending: "bg-amber-100 text-amber-700",
    active: "bg-teal-100 text-teal-700",
    expired: "bg-gray-100 text-gray-500",
    cancelled: "bg-red-100 text-red-500",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { bg: string; icon: React.ReactNode }> = {
    booking: {
      bg: "bg-teal-100 text-teal-600",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    check: {
      bg: "bg-green-100 text-green-600",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    video: {
      bg: "bg-rose-100 text-rose-500",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    user: {
      bg: "bg-purple-100 text-purple-600",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  };
  const { bg, icon } = map[type] ?? map.check;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
      {icon}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatActivityDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PatientDashboardPage() {
  const [firstName, setFirstName] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userId = "";

    supabase.auth.getUser().then(({ data }) => {
      const full = data.user?.user_metadata?.full_name ?? "";
      setFirstName(full.split(" ")[0] || "");
      userId = data.user?.id ?? "";
      if (userId) fetchAppointments(userId);
    });

    async function fetchAppointments(uid: string) {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      setAppointments(data ?? []);
      setLoading(false);
    }

    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAppointments((prev) =>
              [...prev, payload.new as Appointment].sort((a, b) =>
                a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
              )
            );
          } else if (payload.eventType === "UPDATE") {
            setAppointments((prev) =>
              prev.map((a) => (a.id === (payload.new as Appointment).id ? (payload.new as Appointment) : a))
            );
          } else if (payload.eventType === "DELETE") {
            setAppointments((prev) => prev.filter((a) => a.id !== (payload.old as Appointment).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const now = new Date();
  const upcoming = appointments.filter((a) => {
    const apptDate = new Date(`${a.date}T${convertTo24h(a.time)}`);
    return apptDate >= now && a.status !== "cancelled";
  });
  const nextAppt = upcoming[0] ?? null;
  const totalVisits = appointments.filter((a) => a.status === "confirmed" || a.status === "completed").length;

  const activityFeed = appointments.slice(-5).reverse().map((a) => ({
    id: a.id,
    text: `Appointment booked — ${a.type}`,
    time: formatActivityDate(a.created_at),
    icon: "booking",
  }));

  return (
    <div className="p-5 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {getGreeting()}{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Here&apos;s a summary of your health activity.</p>
        </div>
        <Link
          href="/book"
          className="inline-flex items-center gap-2 bg-rose-500 text-white text-sm font-semibold rounded-full px-5 py-2.5 hover:bg-rose-600 transition-colors self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Book Appointment
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Next Appointment"
          value={nextAppt ? new Date(nextAppt.date).toLocaleDateString("en-US", { day: "numeric", month: "short" }) : "—"}
          sub={nextAppt ? `${nextAppt.time} · ${nextAppt.mode}` : "No upcoming appointments"}
          color="bg-teal-100 text-teal-700"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Total Visits"
          value={String(totalVisits)}
          sub={totalVisits === 0 ? "No completed visits yet" : `${totalVisits} confirmed appointment${totalVisits !== 1 ? "s" : ""}`}
          color="bg-purple-100 text-purple-600"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Upcoming Booked"
          value={String(upcoming.length)}
          sub={upcoming.length === 0 ? "Book your first appointment" : `${upcoming.length} scheduled ahead`}
          color="bg-rose-100 text-rose-500"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="All Appointments"
          value={loading ? "…" : String(appointments.length)}
          sub={appointments.length === 0 ? "Nothing yet — get started!" : `Total since joining`}
          color="bg-amber-100 text-amber-600"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Upcoming Appointments</h2>
              <Link href="/patient/appointments" className="text-xs text-teal-600 font-medium hover:underline">
                View all
              </Link>
            </div>

            {loading ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">Loading…</div>
            ) : upcoming.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-500 font-medium">No upcoming appointments</p>
                <p className="text-xs text-gray-400 mt-1">Book one below to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcoming.slice(0, 5).map((appt) => {
                  const dayNum = new Date(appt.date).getDate();
                  const month = new Date(appt.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                  return (
                    <div key={appt.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-12 text-center">
                        <p className="text-xs font-semibold text-teal-600 uppercase leading-none">{month}</p>
                        <p className="text-2xl font-bold text-gray-900 leading-tight">{dayNum}</p>
                      </div>
                      <div className="w-px h-10 bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{appt.type}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(appt.date)} · {appt.time}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                        <Badge status={appt.status} />
                        <span className="text-xs text-gray-400">{appt.mode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-100">
              <Link
                href="/book"
                className="flex items-center justify-center gap-2 w-full text-sm font-medium text-teal-700 bg-teal-50 rounded-xl py-2.5 hover:bg-teal-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Schedule New Appointment
              </Link>
            </div>
          </div>

          {appointments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">All Appointments</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {appointments.map((appt) => {
                  const dayNum = new Date(appt.date).getDate();
                  const month = new Date(appt.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                  return (
                    <div key={appt.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-12 text-center">
                        <p className="text-xs font-semibold text-gray-400 uppercase leading-none">{month}</p>
                        <p className="text-2xl font-bold text-gray-700 leading-tight">{dayNum}</p>
                      </div>
                      <div className="w-px h-10 bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{appt.type}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{appt.time} · {appt.mode}</p>
                      </div>
                      <Badge status={appt.status} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href="/book"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Book Appointment</span>
              </Link>
              <Link
                href="/patient/history"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-sm font-medium">View My Records</span>
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Dr. Amelia Carter</p>
                <p className="text-xs text-teal-200">Your Cardiologist</p>
              </div>
            </div>
            <p className="text-xs text-teal-100 leading-relaxed mb-4">
              Board-certified cardiologist with 15+ years of experience. Available Mon–Fri, 9 AM–5 PM.
            </p>
            <a
              href="tel:+15550123456"
              className="flex items-center gap-2 text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-3 py-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              +1 (555) 012-3456
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
            {activityFeed.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">No activity yet</p>
                <p className="text-xs text-gray-300 mt-1">Book an appointment to see it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activityFeed.map((item, i) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <ActivityIcon type={item.icon} />
                      {i < activityFeed.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 mt-2" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-gray-700 font-medium leading-snug">{item.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function convertTo24h(timeStr: string) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");
  if (modifier === "PM" && hours !== "12") hours = String(parseInt(hours) + 12);
  if (modifier === "AM" && hours === "12") hours = "00";
  return `${hours.padStart(2, "0")}:${minutes}:00`;
}
