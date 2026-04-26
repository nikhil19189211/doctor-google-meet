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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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

  const filtered = appointments
    .filter((a) => filter === "all" || a.status === filter)
    .filter((a) => search === "" || a.type.toLowerCase().includes(search.toLowerCase()) || a.date.includes(search));

  const counts = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  };

  return (
    <div className="p-5 sm:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">All Appointments</h1>
        <p className="text-slate-500 text-sm mt-1">Manage every patient booking from one place</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all capitalize ${
              filter === tab
                ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-900/30"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            {tab} {counts[tab] > 0 && <span className="ml-1 opacity-70">{counts[tab]}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by type or date…"
          className="w-full max-w-sm pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-600 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-10 h-10 text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-500 text-sm">No appointments match this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Appointment Type</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 text-slate-200 font-medium">{fmtDate(appt.date)}</td>
                    <td className="px-6 py-4 text-slate-400">{appt.time}</td>
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
                      <div className="flex gap-2 flex-wrap">
                        {appt.status === "pending" && (
                          <button
                            onClick={() => updateStatus(appt.id, "confirmed")}
                            disabled={updatingId === appt.id}
                            className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            {updatingId === appt.id ? "…" : "Confirm"}
                          </button>
                        )}
                        {appt.status === "confirmed" && (
                          <button
                            onClick={() => updateStatus(appt.id, "completed")}
                            disabled={updatingId === appt.id}
                            className="text-xs font-semibold text-slate-400 bg-slate-700/60 border border-slate-600/40 rounded-lg px-2.5 py-1 hover:bg-slate-700 transition-colors disabled:opacity-50"
                          >
                            {updatingId === appt.id ? "…" : "Complete"}
                          </button>
                        )}
                        {appt.status === "confirmed" && appt.mode === "Video" && (
                          <Link
                            href={`/consult/${appt.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg px-2.5 py-1 hover:bg-teal-500/20 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Start Video
                          </Link>
                        )}
                        {appt.status !== "cancelled" && appt.status !== "completed" && (
                          <button
                            onClick={() => updateStatus(appt.id, "cancelled")}
                            disabled={updatingId === appt.id}
                            className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {updatingId === appt.id ? "…" : "Cancel"}
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

      <p className="text-xs text-slate-600 mt-4">{filtered.length} appointment{filtered.length !== 1 ? "s" : ""} shown</p>
    </div>
  );
}
