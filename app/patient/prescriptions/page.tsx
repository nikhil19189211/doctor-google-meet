"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
};

type Prescription = {
  id: string;
  created_at: string;
  diagnosis: string;
  doctor_note: string;
  medications: Medication[];
  follow_up: string | null;
};

function isActive(rx: Prescription): boolean {
  if (!rx.follow_up) return true;
  return new Date(rx.follow_up) >= new Date();
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
      active ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-teal-500" : "bg-gray-400"}`} />
      {active ? "Active" : "Expired"}
    </span>
  );
}

function PrescriptionCard({ rx, expanded, onToggle }: {
  rx: Prescription;
  expanded: boolean;
  onToggle: () => void;
}) {
  const active = isActive(rx);
  const followDate = rx.follow_up
    ? new Date(rx.follow_up).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const rxDate = new Date(rx.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  function download() {
    const content = `
PRESCRIPTION
============
Date: ${rxDate}
Doctor: Dr. Sarah Carter, MD

DIAGNOSIS
---------
${rx.diagnosis}

MEDICATIONS
-----------
${rx.medications.map((m, i) => `${i + 1}. ${m.name} ${m.dosage}
   Frequency: ${m.frequency}
   Duration: ${m.duration}`).join("\n\n")}

DOCTOR'S NOTE
-------------
${rx.doctor_note || "—"}

${followDate ? `FOLLOW-UP DATE: ${followDate}` : ""}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prescription-${rx.id.slice(0, 8)}-${rx.created_at.slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all ${
      active ? "border-teal-200" : "border-gray-100"
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-gray-50 rounded-2xl transition-colors"
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          active ? "bg-teal-100" : "bg-gray-100"
        }`}>
          <svg className={`w-5 h-5 ${active ? "text-teal-700" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-gray-900 truncate">{rx.diagnosis}</p>
            <StatusBadge active={active} />
          </div>
          <p className="text-xs text-gray-500">
            Issued {rxDate} · {rx.medications.length} medication{rx.medications.length !== 1 ? "s" : ""}
          </p>
          {followDate && (
            <p className="text-xs text-gray-400 mt-0.5">Follow-up: {followDate}</p>
          )}
        </div>

        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 mt-1 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Medications</p>
          <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Medicine</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Dosage</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 hidden sm:table-cell">Frequency</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 hidden sm:table-cell">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rx.medications.map((med, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{med.name}</td>
                    <td className="px-4 py-3 text-teal-700 font-semibold">{med.dosage}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{med.frequency}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{med.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rx.doctor_note && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p className="text-xs font-semibold text-amber-700">Doctor&apos;s Note</p>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed">{rx.doctor_note}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={download}
              className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            {active && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }

      const res = await fetch("/api/patient/prescriptions", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const { prescriptions: data } = await res.json();
        setPrescriptions(data ?? []);
        if (data?.length) setExpandedId(data[0].id);
      }
      setLoading(false);
    });
  }, []);

  const activeRx = prescriptions.filter(isActive);
  const expiredRx = prescriptions.filter((r) => !isActive(r));
  const displayed =
    filter === "all" ? prescriptions :
    filter === "active" ? activeRx : expiredRx;

  return (
    <div className="p-5 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-sm text-gray-500 mt-1">Your medication history from Dr. Carter.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-4 py-2.5 self-start sm:self-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Verified by Dr. Sarah Carter
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: "Total Rx", value: prescriptions.length, color: "bg-gray-50", textColor: "text-gray-700" },
          { label: "Active", value: activeRx.length, color: "bg-teal-50", textColor: "text-teal-700" },
          { label: "Expired", value: expiredRx.length, color: "bg-gray-100", textColor: "text-gray-500" },
        ].map(({ label, value, color, textColor }) => (
          <div key={label} className={`${color} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
            <p className={`text-xs font-medium mt-0.5 ${textColor} opacity-70`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 self-start mb-5 w-fit">
        {(["all", "active", "expired"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-2 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No prescriptions yet</p>
          <p className="text-gray-400 text-sm mt-1">Your doctor will send prescriptions here after a consultation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((rx) => (
            <PrescriptionCard
              key={rx.id}
              rx={rx}
              expanded={expandedId === rx.id}
              onToggle={() => setExpandedId(expandedId === rx.id ? null : rx.id)}
            />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-blue-700 leading-relaxed">
          Prescriptions are issued by Dr. Sarah Carter only after a confirmed consultation. Do not alter dosages without consulting your doctor.
        </p>
      </div>
    </div>
  );
}
