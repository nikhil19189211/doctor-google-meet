"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

type VitalRecord = {
  label: string;
  value: string;
  unit: string;
  trend: "up" | "down" | "stable";
  status: "normal" | "warning" | "elevated";
  date: string;
};

const VITALS: VitalRecord[] = [
  { label: "Blood Pressure", value: "122/80", unit: "mmHg", trend: "stable", status: "normal", date: "Apr 10, 2026" },
  { label: "Heart Rate", value: "74", unit: "bpm", trend: "down", status: "normal", date: "Apr 10, 2026" },
  { label: "Cholesterol", value: "198", unit: "mg/dL", trend: "down", status: "normal", date: "Mar 20, 2026" },
  { label: "Blood Glucose", value: "105", unit: "mg/dL", trend: "stable", status: "warning", date: "Mar 20, 2026" },
  { label: "BMI", value: "24.3", unit: "kg/m²", trend: "stable", status: "normal", date: "Apr 10, 2026" },
  { label: "SpO₂", value: "98", unit: "%", trend: "stable", status: "normal", date: "Apr 10, 2026" },
];

type DocumentRecord = {
  id: string;
  name: string;
  type: "Lab Report" | "ECG" | "X-Ray" | "Prescription" | "Discharge Summary";
  date: string;
  size: string;
};

const DOCUMENTS: DocumentRecord[] = [
  { id: "d1", name: "Complete Blood Count (CBC)", type: "Lab Report", date: "Apr 10, 2026", size: "1.2 MB" },
  { id: "d2", name: "12-Lead ECG Report", type: "ECG", date: "Mar 20, 2026", size: "845 KB" },
  { id: "d3", name: "Chest X-Ray PA View", type: "X-Ray", date: "Mar 20, 2026", size: "3.1 MB" },
  { id: "d4", name: "Lipid Profile Panel", type: "Lab Report", date: "Mar 20, 2026", size: "980 KB" },
  { id: "d5", name: "Discharge Summary — Feb 2026", type: "Discharge Summary", date: "Feb 21, 2026", size: "2.4 MB" },
];

const DOC_ICONS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  "Lab Report": {
    bg: "bg-teal-50", text: "text-teal-700",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
  },
  "ECG": {
    bg: "bg-rose-50", text: "text-rose-600",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  },
  "X-Ray": {
    bg: "bg-purple-50", text: "text-purple-700",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  "Prescription": {
    bg: "bg-amber-50", text: "text-amber-700",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  "Discharge Summary": {
    bg: "bg-blue-50", text: "text-blue-700",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
};

function VitalCard({ vital }: { vital: VitalRecord }) {
  const statusColor = {
    normal: "text-teal-600 bg-teal-50 border-teal-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    elevated: "text-rose-600 bg-rose-50 border-rose-100",
  }[vital.status];

  const trendIcon = vital.trend === "up"
    ? <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
    : vital.trend === "down"
    ? <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    : <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${statusColor.includes("amber") ? "border-amber-100" : statusColor.includes("rose") ? "border-rose-100" : "border-gray-100"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{vital.label}</p>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
          {vital.status}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-black text-gray-900">{vital.value}</span>
          <span className="text-sm text-gray-500 ml-1">{vital.unit}</span>
        </div>
        <div className="flex items-center gap-1">
          {trendIcon}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">{vital.date}</p>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function RecordsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"vitals" | "history" | "documents">("vitals");
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUserInfo({
        name: u?.user_metadata?.full_name ?? u?.email ?? "Patient",
        email: u?.email ?? "",
      });
      if (u?.id) {
        supabase
          .from("appointments")
          .select("*")
          .eq("user_id", u.id)
          .order("date", { ascending: false })
          .then(({ data: appts }) => {
            setAppointments(appts ?? []);
            setLoading(false);
          });
      }
    });
  }, []);

  const completed = appointments.filter((a) => a.status === "confirmed" || a.status === "completed");

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">My Records</h1>
        <p className="text-sm text-gray-500 mt-1">Your complete health profile with Dr. Carter.</p>
      </div>

      {/* Patient identity card */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 mb-7 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold">{userInfo.name}</p>
            <p className="text-teal-200 text-sm">{userInfo.email}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              {[
                { label: "Total Visits", value: completed.length },
                { label: "Active Rx", value: 1 },
                { label: "Documents", value: DOCUMENTS.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/15 rounded-xl px-3 py-1.5">
                  <p className="text-base font-bold">{value}</p>
                  <p className="text-xs text-teal-200">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="self-start sm:self-center">
            <p className="text-xs text-teal-200 text-right">Patient since</p>
            <p className="text-sm font-semibold">
              {appointments.length > 0
                ? new Date(appointments[appointments.length - 1].created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {([
          { key: "vitals", label: "Vitals" },
          { key: "history", label: "Visit History" },
          { key: "documents", label: "Documents" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Vitals section */}
      {activeSection === "vitals" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">Latest Measurements</p>
            <p className="text-xs text-gray-400">Last updated Apr 10, 2026</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {VITALS.map((v) => <VitalCard key={v.label} vital={v} />)}
          </div>
          <div className="mt-4 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700">Vitals are recorded during in-person visits. Book a consultation to update your measurements.</p>
          </div>
        </div>
      )}

      {/* Visit history section */}
      {activeSection === "history" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600">No visit history yet</p>
              <Link href="/book" className="mt-3 inline-flex items-center gap-1 text-sm text-teal-600 font-medium hover:underline">
                Book your first appointment →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {appointments.map((appt, index) => {
                const statusColor: Record<string, string> = {
                  confirmed: "bg-teal-100 text-teal-700",
                  pending: "bg-amber-100 text-amber-700",
                  completed: "bg-green-100 text-green-700",
                  cancelled: "bg-red-100 text-red-500",
                };
                return (
                  <div key={appt.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                      {appointments.length - index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{appt.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(appt.date)} · {appt.time} · {appt.mode}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${statusColor[appt.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {appt.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Documents section */}
      {activeSection === "documents" && (
        <div className="space-y-3">
          {DOCUMENTS.map((doc) => {
            const icon = DOC_ICONS[doc.type];
            return (
              <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${icon.bg} ${icon.text}`}>
                  {icon.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${icon.bg} ${icon.text}`}>{doc.type}</span>
                    <span className="text-xs text-gray-400">{doc.date}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400">{doc.size}</span>
                  </div>
                </div>
                <button className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors opacity-0 group-hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            );
          })}

          <div className="mt-2 flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-500">Documents are added by Dr. Carter after your consultation. Request a copy at your next visit.</p>
          </div>
        </div>
      )}
    </div>
  );
}
