"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Appointment = {
  id: string;
  date: string;
  time: string;
  type: string;
  mode: string;
  status: string;
  created_at: string;
  user_id: string;
};

type Medication = { name: string; dosage: string; frequency: string; duration: string };
type Prescription = { diagnosis: string; doctorNote: string; medications: Medication[]; followUp: string };

// Demo prescriptions pool — assigned deterministically to completed consults
const PRESCRIPTION_POOL: Prescription[] = [
  {
    diagnosis: "Mild Hypertension (Stage 1)",
    doctorNote: "Monitor BP daily. Reduce sodium intake and increase physical activity. Avoid caffeine after 6 PM.",
    medications: [
      { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", duration: "30 days" },
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily (morning)", duration: "30 days" },
    ],
    followUp: "2026-05-10",
  },
  {
    diagnosis: "Viral Upper Respiratory Infection",
    doctorNote: "Rest and hydration recommended. Avoid strenuous activity for 5–7 days.",
    medications: [
      { name: "Paracetamol", dosage: "500mg", frequency: "Every 6 hours as needed", duration: "5 days" },
      { name: "Cetirizine", dosage: "10mg", frequency: "Once daily at night", duration: "7 days" },
    ],
    followUp: "2026-05-28",
  },
  {
    diagnosis: "Hypertension — Follow-up Review",
    doctorNote: "BP improving. Continue current medication. Return if symptoms worsen or if BP exceeds 140/90.",
    medications: [
      { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", duration: "60 days" },
    ],
    followUp: "2026-06-15",
  },
];

function getEventKind(type: string): "booking" | "consultation" | "followup" {
  const t = type.toLowerCase();
  if (t.includes("follow")) return "followup";
  if (
    t.includes("consult") ||
    t.includes("specialist") ||
    t.includes("cardio") ||
    t.includes("check") ||
    t.includes("general") ||
    t.includes("annual") ||
    t.includes("wellness")
  )
    return "consultation";
  return "booking";
}

const FEE_MAP: Record<ReturnType<typeof getEventKind>, number> = {
  consultation: 150,
  followup: 80,
  booking: 50,
};

function getFee(type: string) {
  return FEE_MAP[getEventKind(type)];
}

function getPrescriptionForAppt(appt: Appointment, index: number): Prescription | null {
  if (appt.status !== "completed" && appt.status !== "confirmed") return null;
  const kind = getEventKind(appt.type);
  if (kind === "booking") return null;
  return PRESCRIPTION_POOL[index % PRESCRIPTION_POOL.length];
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

async function downloadInvoicePDF(appt: Appointment, patientName: string) {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { height } = page.getSize();
  const fee = getFee(appt.type);
  const tax = Math.round(fee * 0.1 * 100) / 100;
  const total = fee + tax;
  const teal = rgb(0.039, 0.553, 0.522);
  const dark = rgb(0.1, 0.1, 0.1);
  const mid = rgb(0.4, 0.4, 0.4);
  const light = rgb(0.6, 0.6, 0.6);
  const white = rgb(1, 1, 1);

  // Header bar
  page.drawRectangle({ x: 0, y: height - 110, width: 595, height: 110, color: teal });
  page.drawText("MEDICAL INVOICE", { x: 40, y: height - 48, font: bold, size: 24, color: white });
  page.drawText("Dr. Amelia Carter, MD  ·  Cardiologist", { x: 40, y: height - 70, font, size: 10, color: rgb(0.75, 0.97, 0.95) });
  page.drawText("SYNEPTEX Health  ·  contact@syneptex.health  ·  +1 (555) 012-3456", { x: 40, y: height - 88, font, size: 8.5, color: rgb(0.75, 0.97, 0.95) });

  // Invoice meta block (right side of header)
  const invNo = `INV-${appt.id.slice(0, 8).toUpperCase()}`;
  page.drawText(invNo, { x: 400, y: height - 48, font: bold, size: 13, color: white });
  page.drawText(`Date: ${formatDateShort(appt.date)}`, { x: 400, y: height - 66, font, size: 9, color: rgb(0.8, 0.97, 0.95) });
  page.drawText(`Status: ${appt.status.toUpperCase()}`, { x: 400, y: height - 80, font, size: 9, color: rgb(0.8, 0.97, 0.95) });

  let y = height - 145;

  // Bill to
  page.drawText("BILL TO", { x: 40, y, font: bold, size: 8, color: mid });
  y -= 16;
  page.drawText(patientName, { x: 40, y, font: bold, size: 11, color: dark });
  y -= 14;
  page.drawText("Patient — SYNEPTEX Health Portal", { x: 40, y, font, size: 9, color: mid });

  y -= 40;

  // Services table
  page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 24, color: rgb(0.95, 0.97, 0.96) });
  page.drawText("Description", { x: 50, y: y + 5, font: bold, size: 9, color: rgb(0.2, 0.2, 0.2) });
  page.drawText("Mode", { x: 320, y: y + 5, font: bold, size: 9, color: rgb(0.2, 0.2, 0.2) });
  page.drawText("Time", { x: 400, y: y + 5, font: bold, size: 9, color: rgb(0.2, 0.2, 0.2) });
  page.drawText("Amount", { x: 490, y: y + 5, font: bold, size: 9, color: rgb(0.2, 0.2, 0.2) });
  y -= 30;

  page.drawText(appt.type, { x: 50, y, font, size: 9, color: dark });
  page.drawText(appt.mode, { x: 320, y, font, size: 9, color: mid });
  page.drawText(appt.time, { x: 400, y, font, size: 9, color: mid });
  page.drawText(`$${fee.toFixed(2)}`, { x: 490, y, font, size: 9, color: dark });
  y -= 30;

  page.drawLine({ start: { x: 40, y: y + 10 }, end: { x: 555, y: y + 10 }, thickness: 0.5, color: rgb(0.88, 0.88, 0.88) });

  page.drawText("Consultation Fee", { x: 380, y, font, size: 9, color: mid });
  page.drawText(`$${fee.toFixed(2)}`, { x: 490, y, font, size: 9, color: mid });
  y -= 18;
  page.drawText("Tax (10%)", { x: 380, y, font, size: 9, color: mid });
  page.drawText(`$${tax.toFixed(2)}`, { x: 490, y, font, size: 9, color: mid });
  y -= 18;

  page.drawLine({ start: { x: 370, y: y + 8 }, end: { x: 555, y: y + 8 }, thickness: 1, color: teal });
  y -= 18;

  page.drawText("TOTAL DUE", { x: 380, y, font: bold, size: 11, color: teal });
  page.drawText(`$${total.toFixed(2)}`, { x: 480, y, font: bold, size: 12, color: teal });

  y -= 60;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: rgb(0.88, 0.88, 0.88) });
  y -= 18;
  page.drawText("Thank you for choosing SYNEPTEX Health. This is an auto-generated invoice.", { x: 40, y, font, size: 8, color: light });
  y -= 14;
  page.drawText("Questions? Email contact@syneptex.health or call +1 (555) 012-3456", { x: 40, y, font, size: 8, color: light });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${invNo}-${appt.date}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPrescriptionPDF(appt: Appointment, rx: Prescription, patientName: string) {
  const lines = [
    "PRESCRIPTION",
    "============",
    `Date        : ${formatDate(appt.date)}`,
    `Doctor      : Dr. Amelia Carter, MD — Cardiologist`,
    `Patient     : ${patientName}`,
    `Appointment : ${appt.type} (${appt.mode})`,
    "",
    "DIAGNOSIS",
    "---------",
    rx.diagnosis,
    "",
    "MEDICATIONS",
    "-----------",
    ...rx.medications.map(
      (m, i) =>
        `${i + 1}. ${m.name} ${m.dosage}\n   Frequency : ${m.frequency}\n   Duration  : ${m.duration}`
    ),
    "",
    "DOCTOR'S NOTE",
    "-------------",
    rx.doctorNote,
    "",
    `FOLLOW-UP DATE : ${formatDate(rx.followUp)}`,
    "",
    "──────────────────────────────────────────────",
    "Do not alter dosages without consulting your doctor.",
    "Emergency: +1 (555) 012-3456",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prescription-${appt.date}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-teal-100 text-teal-700",
    completed: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-500",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ── Invoice panel ─────────────────────────────────────────────────────────────
function InvoicePanel({
  appt,
  patientName,
}: {
  appt: Appointment;
  patientName: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const fee = getFee(appt.type);
  const tax = Math.round(fee * 0.1 * 100) / 100;
  const total = fee + tax;

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadInvoicePDF(appt, patientName);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-blue-100">
        <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
        <p className="text-sm font-semibold text-blue-800">Invoice</p>
        <span className="ml-auto text-xs text-blue-500 font-mono">INV-{appt.id.slice(0, 8).toUpperCase()}</span>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-xs text-blue-700">
          <span>{appt.type}</span>
          <span>${fee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-blue-500">
          <span>Tax (10%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="h-px bg-blue-200 my-1" />
        <div className="flex justify-between text-sm font-bold text-blue-900">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
        >
          {downloading ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          {downloading ? "Generating PDF…" : "Download Invoice PDF"}
        </button>
      </div>
    </div>
  );
}

// ── Prescription panel ────────────────────────────────────────────────────────
function PrescriptionPanel({
  appt,
  rx,
  patientName,
}: {
  appt: Appointment;
  rx: Prescription | null;
  patientName: string;
}) {
  const isPending = rx === null;

  if (isPending) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">Prescription pending</p>
          <p className="text-xs text-amber-600 mt-0.5">Will be available after your consultation is marked complete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-teal-100">
        <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-semibold text-teal-800">Prescription</p>
        <span className="ml-auto text-xs font-medium text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Active</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div>
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-0.5">Diagnosis</p>
          <p className="text-sm font-semibold text-teal-900">{rx.diagnosis}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">Medications</p>
          <div className="rounded-xl overflow-hidden border border-teal-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-teal-100/60">
                  <th className="text-left px-3 py-2 font-semibold text-teal-700">Medicine</th>
                  <th className="text-left px-3 py-2 font-semibold text-teal-700">Dosage</th>
                  <th className="text-left px-3 py-2 font-semibold text-teal-700 hidden sm:table-cell">Frequency</th>
                  <th className="text-left px-3 py-2 font-semibold text-teal-700 hidden sm:table-cell">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-100/60">
                {rx.medications.map((med) => (
                  <tr key={med.name} className="bg-white/60">
                    <td className="px-3 py-2 font-medium text-gray-900">{med.name}</td>
                    <td className="px-3 py-2 font-bold text-teal-700">{med.dosage}</td>
                    <td className="px-3 py-2 text-gray-600 hidden sm:table-cell">{med.frequency}</td>
                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{med.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <p className="text-xs font-semibold text-amber-700 mb-1">Doctor&apos;s Note</p>
          <p className="text-xs text-amber-900 leading-relaxed">{rx.doctorNote}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-teal-700">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Follow-up: <strong>{formatDate(rx.followUp)}</strong></span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => downloadPrescriptionPDF(appt, rx, patientName)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Prescription
        </button>
      </div>
    </div>
  );
}

// ── Timeline event card ───────────────────────────────────────────────────────
function TimelineCard({
  appt,
  index,
  patientName,
  isLast,
}: {
  appt: Appointment;
  index: number;
  patientName: string;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const kind = getEventKind(appt.type);
  const rx = getPrescriptionForAppt(appt, index);

  const kindMeta = {
    booking: {
      label: "Booking",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
      dotColor: "bg-blue-500",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    consultation: {
      label: "Consultation",
      iconBg: "bg-teal-100",
      iconText: "text-teal-600",
      dotColor: "bg-teal-500",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    followup: {
      label: "Follow-up",
      iconBg: "bg-purple-100",
      iconText: "text-purple-600",
      dotColor: "bg-purple-500",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
  }[kind];

  return (
    <div className="flex gap-4">
      {/* Timeline spine + icon */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center z-10 ${kindMeta.iconBg} ${kindMeta.iconText}`}>
          {kindMeta.icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-100 mt-2" />}
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {/* Header row */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${kindMeta.iconBg} ${kindMeta.iconText}`}>
                {kindMeta.label}
              </span>
              <StatusBadge status={appt.status} />
            </div>
            <p className="text-sm font-bold text-gray-900">{appt.type}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDateShort(appt.date)}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {appt.time}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {appt.mode}
              </span>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded content */}
        {open && (
          <div className="px-5 pb-5 border-t border-gray-50 pt-4">
            {kind === "booking" && (
              <InvoicePanel appt={appt} patientName={patientName} />
            )}
            {(kind === "consultation" || kind === "followup") && (
              <PrescriptionPanel appt={appt} rx={rx} patientName={patientName} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyRecordsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: "", email: "", id: "" });

  const flashLive = useCallback(() => {
    setLiveIndicator(true);
    setTimeout(() => setLiveIndicator(false), 2000);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) { router.push("/login"); return; }

      const name = u.user_metadata?.full_name ?? u.email ?? "Patient";
      setUserInfo({ name, email: u.email ?? "", id: u.id });

      // Initial fetch
      supabase
        .from("appointments")
        .select("*")
        .eq("user_id", u.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .then(({ data: appts }) => {
          setAppointments((appts as Appointment[]) ?? []);
          setLoading(false);
        });

      // Real-time subscription
      const channel = supabase
        .channel(`my-records-${u.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${u.id}` },
          (payload) => {
            flashLive();
            if (payload.eventType === "INSERT") {
              setAppointments((prev) =>
                [payload.new as Appointment, ...prev].sort(
                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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

      return () => { supabase.removeChannel(channel); };
    });
  }, [router, flashLive]);

  const consultCount = appointments.filter((a) => getEventKind(a.type) === "consultation").length;
  const followupCount = appointments.filter((a) => getEventKind(a.type) === "followup").length;
  const bookingCount = appointments.filter((a) => getEventKind(a.type) === "booking").length;

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/patient"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800">My Records</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${liveIndicator ? "bg-teal-400 animate-pulse" : "bg-gray-300"}`} />
              <span className="text-xs text-gray-400 hidden sm:block">{liveIndicator ? "Updated" : "Live"}</span>
            </div>
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Book
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">

        {/* Patient summary strip */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 mb-8 flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{userInfo.name || "Patient"}</p>
            <p className="text-xs text-gray-500 truncate">{userInfo.email}</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { label: "Bookings", value: bookingCount, color: "text-blue-600" },
              { label: "Consultations", value: consultCount, color: "text-teal-600" },
              { label: "Follow-ups", value: followupCount, color: "text-purple-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-lg font-black ${color}`}>{loading ? "—" : value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section heading */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-gray-900">History Timeline</h2>
          <p className="text-xs text-gray-400">Most recent first</p>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading your records…</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">No records yet</p>
              <p className="text-xs text-gray-400 mt-1">Your bookings, consultations, and follow-ups will appear here.</p>
            </div>
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full transition-colors"
            >
              Book your first appointment →
            </Link>
          </div>
        ) : (
          <div className="relative">
            {appointments.map((appt, i) => (
              <TimelineCard
                key={appt.id}
                appt={appt}
                index={i}
                patientName={userInfo.name}
                isLast={i === appointments.length - 1}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        {!loading && appointments.length > 0 && (
          <div className="mt-4 flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-500 leading-relaxed">
              Prescriptions and invoices are generated by Dr. Carter after each visit.
              This page updates in real-time. For queries, call{" "}
              <a href="tel:+15550123456" className="font-semibold text-gray-700 hover:underline">+1 (555) 012-3456</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
