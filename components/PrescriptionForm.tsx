"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Medication = { name: string; dosage: string; frequency: string; duration: string };

type FormData = {
  patientName:  string;
  patientEmail: string;
  diagnosis:    string;
  medications:  Medication[];
  notes:        string;
  followUp:     string;
};

type Toast = { kind: "success" | "draft" | "error"; message: string } | null;

export interface PrescriptionFormProps {
  initialPatientName?:  string;
  initialPatientEmail?: string;
  appointmentId?:       string;
  /** localStorage key — use a per-session value (e.g. `rx-draft-${roomId}`) so
   *  drafts don't bleed between consultations. */
  draftKey?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_MED: Medication = { name: "", dosage: "", frequency: "", duration: "" };

function makeForm(name: string, email: string): FormData {
  return { patientName: name, patientEmail: email, diagnosis: "", medications: [{ ...EMPTY_MED }], notes: "", followUp: "" };
}

const FIELD  = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white";
const MEDFIELD = "border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-900 placeholder:text-gray-400";

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrescriptionForm({
  initialPatientName  = "",
  initialPatientEmail = "",
  appointmentId,
  draftKey = "rx-draft",
}: PrescriptionFormProps) {
  const [form,       setForm]       = useState<FormData>(() => makeForm(initialPatientName, initialPatientEmail));
  const [submitting, setSubmitting] = useState(false);
  const [toast,      setToast]      = useState<Toast>(null);

  // ── Load draft once on mount ─────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setForm(JSON.parse(raw) as FormData);
    } catch { /* ignore corrupt draft */ }
  }, [draftKey]);

  // ── Auto-dismiss toast ───────────────────────────────────────────────────

  useEffect(() => {
    if (!toast) return;
    const ttl = toast.kind === "success" ? 5000 : 3000;
    const id = setTimeout(() => setToast(null), ttl);
    return () => clearTimeout(id);
  }, [toast]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const setField = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const setMedField = useCallback((idx: number, field: keyof Medication, val: string) => {
    setForm(prev => {
      const meds = [...prev.medications];
      meds[idx] = { ...meds[idx], [field]: val };
      return { ...prev, medications: meds };
    });
  }, []);

  const addMed    = useCallback(() => setForm(p => ({ ...p, medications: [...p.medications, { ...EMPTY_MED }] })), []);
  const removeMed = useCallback((idx: number) => setForm(p => ({ ...p, medications: p.medications.filter((_, i) => i !== idx) })), []);

  // ── Save draft ───────────────────────────────────────────────────────────

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(form));
      setToast({ kind: "draft", message: "Draft saved locally." });
    } catch {
      setToast({ kind: "error", message: "Could not save draft." });
    }
  }, [draftKey, form]);

  // ── Submit prescription ──────────────────────────────────────────────────

  const submit = useCallback(async () => {
    const meds = form.medications.filter(m => m.name.trim());
    if (!form.patientEmail.trim()) { setToast({ kind: "error", message: "Patient email is required." }); return; }
    if (!form.diagnosis.trim())    { setToast({ kind: "error", message: "Diagnosis is required." });    return; }
    if (!meds.length)              { setToast({ kind: "error", message: "Add at least one medication." }); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientEmail:  form.patientEmail.trim(),
          diagnosis:     form.diagnosis.trim(),
          medications:   meds,
          doctorNote:    form.notes.trim(),
          followUp:      form.followUp || null,
          appointmentId: appointmentId ?? null,
        }),
      });
      const body = await res.json();
      if (!res.ok || body.error) {
        setToast({ kind: "error", message: body.error ?? "Failed to send prescription." });
        return;
      }
      // Clear draft on success, reset to prefilled blank state
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      setForm(makeForm(initialPatientName, initialPatientEmail));
      setToast({ kind: "success", message: "Prescription sent to patient!" });
    } catch {
      setToast({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }, [form, appointmentId, draftKey, initialPatientName, initialPatientEmail]);

  const filledCount = form.medications.filter(m => m.name.trim()).length;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Prescription</p>
          <p className="text-xs text-gray-400">
            {filledCount > 0 ? `${filledCount} medication${filledCount > 1 ? "s" : ""} added` : "No medications yet"}
          </p>
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`mx-4 mt-3 flex items-start gap-2.5 rounded-xl px-4 py-3 flex-shrink-0 ${
          toast.kind === "success" ? "bg-emerald-50 border border-emerald-200" :
          toast.kind === "draft"   ? "bg-blue-50 border border-blue-200"       :
                                     "bg-red-50 border border-red-200"
        }`}>
          {toast.kind === "success" && <CheckIcon className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />}
          {toast.kind === "draft"   && <CheckIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />}
          {toast.kind === "error"   && <WarnIcon  className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
          <p className={`text-sm font-medium ${
            toast.kind === "success" ? "text-emerald-700" :
            toast.kind === "draft"   ? "text-blue-700"    :
                                       "text-red-700"
          }`}>{toast.message}</p>
        </div>
      )}

      {/* ── Scrollable form body ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">

        {/* Patient */}
        <section>
          <SectionLabel>Patient</SectionLabel>
          <div className="space-y-3">
            <div>
              <FieldLabel>Patient Name</FieldLabel>
              <input
                type="text"
                value={form.patientName}
                onChange={e => setField("patientName", e.target.value)}
                placeholder="e.g. John Smith"
                className={FIELD}
              />
            </div>
            <div>
              <FieldLabel required>Patient Email</FieldLabel>
              <input
                type="email"
                value={form.patientEmail}
                onChange={e => setField("patientEmail", e.target.value)}
                placeholder="patient@example.com"
                className={FIELD}
              />
            </div>
          </div>
        </section>

        {/* Diagnosis */}
        <section>
          <FieldLabel required>Diagnosis</FieldLabel>
          <input
            type="text"
            value={form.diagnosis}
            onChange={e => setField("diagnosis", e.target.value)}
            placeholder="e.g. Mild Hypertension (Stage 1)"
            className={FIELD}
          />
        </section>

        {/* Medications */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Medications *</SectionLabel>
            <button type="button" onClick={addMed}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Row
            </button>
          </div>
          <div className="space-y-3">
            {form.medications.map((med, i) => (
              <MedRow
                key={i}
                index={i}
                med={med}
                canRemove={form.medications.length > 1}
                fieldClass={MEDFIELD}
                onChange={setMedField}
                onRemove={removeMed}
              />
            ))}
          </div>
        </section>

        {/* Notes */}
        <section>
          <FieldLabel>Notes / Instructions</FieldLabel>
          <textarea
            value={form.notes}
            onChange={e => setField("notes", e.target.value)}
            placeholder="Lifestyle advice, warnings, special instructions…"
            rows={3}
            className={`${FIELD} resize-none`}
          />
        </section>

        {/* Follow-up */}
        <section className="pb-2">
          <FieldLabel>Follow-up Date</FieldLabel>
          <input
            type="date"
            value={form.followUp}
            onChange={e => setField("followUp", e.target.value)}
            className={FIELD}
          />
        </section>
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-100 px-5 py-4 space-y-2.5 bg-white">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-semibold rounded-xl py-3 transition-colors text-sm"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Submit Prescription
            </>
          )}
        </button>

        <button
          type="button"
          onClick={saveDraft}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-600 font-semibold rounded-xl py-2.5 border border-gray-200 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Draft
        </button>

        <p className="text-[11px] text-center text-gray-400">
          Prescription appears immediately in the patient&apos;s records
        </p>
      </div>
    </div>
  );
}

// ─── MedRow ───────────────────────────────────────────────────────────────────

function MedRow({
  index, med, canRemove, fieldClass, onChange, onRemove,
}: {
  index:      number;
  med:        Medication;
  canRemove:  boolean;
  fieldClass: string;
  onChange:   (idx: number, field: keyof Medication, val: string) => void;
  onRemove:   (idx: number) => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Med #{index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="space-y-2">
        <input
          type="text"
          value={med.name}
          onChange={e => onChange(index, "name", e.target.value)}
          placeholder="Drug name"
          className={`w-full ${fieldClass}`}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={med.dosage}
            onChange={e => onChange(index, "dosage", e.target.value)}
            placeholder="Dosage (e.g. 5 mg)"
            className={fieldClass}
          />
          <input
            type="text"
            value={med.duration}
            onChange={e => onChange(index, "duration", e.target.value)}
            placeholder="Duration (e.g. 14 days)"
            className={fieldClass}
          />
        </div>
        <input
          type="text"
          value={med.frequency}
          onChange={e => onChange(index, "frequency", e.target.value)}
          placeholder="Frequency (e.g. Twice daily after meals)"
          className={`w-full ${fieldClass}`}
        />
      </div>
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">{children}</p>;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
