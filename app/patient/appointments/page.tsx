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

type Tab = "upcoming" | "past" | "all";

function Badge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-teal-100 text-teal-700",
    pending: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-500",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function ModeIcon() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-full px-2.5 py-1">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      In-Person
    </span>
  );
}

function convertTo24h(timeStr: string) {
  const [time, modifier] = timeStr.split(" ");
  let [hours] = time.split(":");
  const [, minutes] = time.split(":");
  if (modifier === "PM" && hours !== "12") hours = String(parseInt(hours) + 12);
  if (modifier === "AM" && hours === "12") hours = "00";
  return `${hours.padStart(2, "0")}:${minutes}:00`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let userId = "";

    supabase.auth.getUser().then(({ data }) => {
      userId = data.user?.id ?? "";
      if (userId) fetchAppointments(userId);
    });

    async function fetchAppointments(uid: string) {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: false })
        .order("time", { ascending: false });
      setAppointments(data ?? []);
      setLoading(false);
    }

    const channel = supabase
      .channel("appts-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setAppointments((prev) => [payload.new as Appointment, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setAppointments((prev) =>
            prev.map((a) => (a.id === (payload.new as Appointment).id ? (payload.new as Appointment) : a))
          );
        } else if (payload.eventType === "DELETE") {
          setAppointments((prev) => prev.filter((a) => a.id !== (payload.old as Appointment).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleCancel(id: string) {
    setCancelling(id);
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    setCancelling(null);
  }

  const now = new Date();

  const filtered = appointments.filter((a) => {
    const apptDate = new Date(`${a.date}T${convertTo24h(a.time)}`);
    const isUpcoming = apptDate >= now && a.status !== "cancelled";
    const isPast = apptDate < now || a.status === "cancelled" || a.status === "completed";

    const matchesTab =
      tab === "all" ? true : tab === "upcoming" ? isUpcoming : isPast;

    const matchesSearch =
      search === "" ||
      a.type.toLowerCase().includes(search.toLowerCase()) ||
      a.mode.toLowerCase().includes(search.toLowerCase()) ||
      a.status.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const counts = {
    upcoming: appointments.filter((a) => {
      const d = new Date(`${a.date}T${convertTo24h(a.time)}`);
      return d >= now && a.status !== "cancelled";
    }).length,
    past: appointments.filter((a) => {
      const d = new Date(`${a.date}T${convertTo24h(a.time)}`);
      return d < now || a.status === "cancelled" || a.status === "completed";
    }).length,
    all: appointments.length,
  };

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all your consultations.</p>
        </div>
        <Link
          href="/book"
          className="inline-flex items-center gap-2 bg-rose-500 text-white text-sm font-semibold rounded-full px-5 py-2.5 hover:bg-rose-600 transition-colors self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Book New
        </Link>
      </div>

      {/* Tabs + Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 self-start">
            {(["upcoming", "past", "all"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t}
                <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                  tab === t ? "bg-teal-100 text-teal-700" : "bg-gray-200 text-gray-500"
                }`}>
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search appointments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 w-52"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-3">Loading appointments…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600">No appointments found</p>
            <p className="text-xs text-gray-400 mt-1">
              {tab === "upcoming" ? "You have no upcoming appointments." : tab === "past" ? "No past appointments yet." : "Nothing here yet."}
            </p>
            {tab === "upcoming" && (
              <Link href="/book" className="mt-4 inline-flex items-center gap-1 text-sm text-teal-600 font-medium hover:underline">
                Book one now →
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((appt) => {
              const apptDate = new Date(`${appt.date}T${convertTo24h(appt.time)}`);
              const isPast = apptDate < now || appt.status === "cancelled" || appt.status === "completed";
              const dayNum = new Date(appt.date).getDate();
              const month = new Date(appt.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
              const weekday = new Date(appt.date).toLocaleDateString("en-US", { weekday: "short" });

              return (
                <div key={appt.id} className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${isPast ? "opacity-60" : ""}`}>
                  {/* Date column */}
                  <div className={`flex-shrink-0 w-14 text-center rounded-xl py-2 ${isPast ? "bg-gray-100" : "bg-teal-50"}`}>
                    <p className={`text-xs font-bold uppercase leading-none ${isPast ? "text-gray-400" : "text-teal-600"}`}>{month}</p>
                    <p className={`text-2xl font-black leading-tight ${isPast ? "text-gray-500" : "text-gray-900"}`}>{dayNum}</p>
                    <p className="text-xs text-gray-400">{weekday}</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900">{appt.type}</p>
                      <Badge status={appt.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {appt.time}
                      </span>
                      <span className="text-gray-300">·</span>
                      <ModeIcon />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(appt.date)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2 pt-1">
                    {!isPast && appt.status !== "cancelled" && (
                      <>
                        <button
                          onClick={() => handleCancel(appt.id)}
                          disabled={cancelling === appt.id}
                          className="text-xs font-medium text-rose-500 hover:text-rose-700 transition-colors disabled:opacity-50"
                        >
                          {cancelling === appt.id ? "Cancelling…" : "Cancel"}
                        </button>
                      </>
                    )}
                    {appt.status === "cancelled" && (
                      <span className="text-xs text-gray-400 italic">Cancelled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary footer */}
      {!loading && appointments.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Booked", value: counts.all, color: "bg-gray-50 text-gray-700" },
            { label: "Upcoming", value: counts.upcoming, color: "bg-teal-50 text-teal-700" },
            { label: "Past / Cancelled", value: counts.past, color: "bg-rose-50 text-rose-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-2xl p-4 ${color} text-center`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-70">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
