"use client";

import { useState, useEffect } from "react";

export default function PatientProfilePage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/patient/profile")
      .then((r) => r.json())
      .then((data) => {
        setEmail(data.email ?? "");
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) {
      setError("Phone must be in E.164 format, e.g. +919876543210");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/patient/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, phone }),
    });
    const data = await res.json();
    setSaving(false);

    if (data.success) {
      setSuccess("Profile updated! SMS and WhatsApp notifications will now be sent to your number.");
    } else {
      setError(data.error ?? "Failed to save. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Add your phone number to receive SMS and WhatsApp appointment notifications.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">

        {/* WhatsApp opt-in notice */}
        <div className="mb-6 flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">WhatsApp Sandbox — One-time opt-in required</p>
            <p>
              Send the message{" "}
              <strong className="font-mono">join plenty-human</strong> to{" "}
              <strong>+1 (415) 523-8886</strong> on WhatsApp to receive WhatsApp notifications.
              You only need to do this once.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email address <span className="font-normal text-gray-400">(cannot be changed)</span>
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
            />
          </div>

          {/* Full name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Full name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Phone number{" "}
              <span className="font-normal text-gray-400">(for SMS &amp; WhatsApp reminders)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Must include country code in E.164 format — e.g.{" "}
              <span className="font-mono">+919876543210</span> for India,{" "}
              <span className="font-mono">+12125551234</span> for US
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 bg-teal-50 border border-teal-200 text-teal-700 text-sm rounded-xl px-4 py-3">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-teal-600 text-white font-semibold rounded-xl py-3.5 hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-lg shadow-teal-500/20"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </span>
            ) : "Save Profile"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">How notifications work</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span><strong className="text-gray-700">Email</strong> — confirmation sent immediately after payment</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span><strong className="text-gray-700">SMS &amp; WhatsApp</strong> — requires your phone number above</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>24-hour reminder and 15-minute meeting alert are sent automatically</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
