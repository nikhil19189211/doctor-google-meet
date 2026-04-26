"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Appointment = {
  id: string;
  user_id: string;
  date: string;
  time: string;
  type: string;
  mode: string;
  status: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending:   "bg-amber-500/10  text-amber-400  border-amber-500/20",
  active:    "bg-blue-500/10   text-blue-400   border-blue-500/20",
  cancelled: "bg-red-500/10    text-red-400    border-red-500/20",
  completed: "bg-slate-500/10  text-slate-400  border-slate-500/20",
  expired:   "bg-slate-500/10  text-slate-500  border-slate-600/20",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize border ${STATUS_STYLES[status] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, icon, accent }: { label: string; value: string | number; sub: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function AdminDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/appointments")
      .then((r) => r.json())
      .then(({ appointments: data }) => {
        setAppointments(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setUpdatingId(null);
  }

  const today = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter((a) => a.date === today);
  const pending = appointments.filter((a) => a.status === "pending");
  const upcoming = appointments.filter((a) => a.date >= today && a.status !== "cancelled");
  const videoAppts = appointments.filter((a) => a.mode === "Video");

  return (
    <div className="p-5 sm:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {getGreeting()}, Doctor
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/dashboard/meetings"
            className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            New Meeting
          </Link>
          <Link
            href="/admin/dashboard/slots"
            className="inline-flex items-center gap-2 bg-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Manage Slots
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Today's Appointments"
          value={loading ? "—" : todayAppts.length}
          sub={todayAppts.length === 1 ? "1 patient today" : `${todayAppts.length} patients today`}
          accent="bg-blue-600/20 text-blue-400"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Review"
          value={loading ? "—" : pending.length}
          sub={pending.length === 0 ? "All confirmed" : "Awaiting confirmation"}
          accent="bg-amber-500/20 text-amber-400"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Upcoming"
          value={loading ? "—" : upcoming.length}
          sub="Scheduled ahead"
          accent="bg-emerald-500/20 text-emerald-400"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Video Consultations"
          value={loading ? "—" : videoAppts.length}
          sub="Total online visits"
          accent="bg-purple-500/20 text-purple-400"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { href: "/admin/dashboard/appointments", label: "All Appointments", desc: "View & manage every booking", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "text-blue-400 bg-blue-600/10 border-blue-500/20" },
          { href: "/admin/dashboard/slots", label: "Time Slots", desc: "Set weekly availability", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-400 bg-emerald-600/10 border-emerald-500/20" },
          { href: "/admin/dashboard/meetings", label: "Video Meetings", desc: "Create & join consultations", icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", color: "text-purple-400 bg-purple-600/10 border-purple-500/20" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`bg-slate-900 border rounded-2xl p-5 hover:bg-slate-800/80 transition-colors flex items-start gap-4 group ${item.color.split(" ").find(c => c.startsWith("border")) ?? "border-slate-800"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${item.color}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors">{item.label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Appointments table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">All Appointments</h2>
            <p className="text-xs text-slate-500 mt-0.5">All patient bookings · click status to update</p>
          </div>
          <Link href="/admin/dashboard/appointments" className="text-xs text-blue-400 font-medium hover:underline">
            Full view →
          </Link>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-slate-600 text-sm">Loading appointments…</div>
        ) : appointments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-10 h-10 text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-500 text-sm">No appointments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {appointments.slice(0, 10).map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{fmtDate(appt.date)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{appt.time}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{appt.type}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${appt.mode === "Video" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-slate-700/60 text-slate-400 border-slate-600/40"}`}>
                        {appt.mode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={appt.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {appt.status === "pending" && (
                          <button
                            onClick={() => updateStatus(appt.id, "confirmed")}
                            disabled={updatingId === appt.id}
                            className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            Confirm
                          </button>
                        )}
                        {appt.status !== "cancelled" && appt.status !== "completed" && (
                          <button
                            onClick={() => updateStatus(appt.id, "cancelled")}
                            disabled={updatingId === appt.id}
                            className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                        {appt.status === "confirmed" && (
                          <button
                            onClick={() => updateStatus(appt.id, "completed")}
                            disabled={updatingId === appt.id}
                            className="text-xs font-semibold text-slate-400 bg-slate-700/60 border border-slate-600/40 rounded-lg px-2.5 py-1 hover:bg-slate-700 transition-colors disabled:opacity-50"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
