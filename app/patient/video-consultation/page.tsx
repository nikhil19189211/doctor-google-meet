"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PatientVideoConsultationPage() {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setMeetingId(e.target.value.trim());
    setError(null);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const id = meetingId.trim();
    if (!id) {
      setError("Please enter the Meeting ID provided by your doctor.");
      return;
    }
    router.push(`/video-room/${encodeURIComponent(id)}`);
  }

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">

      {/* Hero strip */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-10 text-white">
        <div className="max-w-3xl mx-auto flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <VideoIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Video Consultation</h1>
            <p className="text-teal-100 text-sm mt-0.5">Join your online appointment with Dr. Carter</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-10">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* Join card */}
          <div className="md:col-span-3">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-7 pt-7 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                    <LinkIcon className="w-5 h-5 text-teal-600" />
                  </div>
                  <h2 className="text-gray-900 font-bold text-lg">Enter Meeting ID</h2>
                </div>
                <p className="text-gray-500 text-sm ml-12 mb-6">
                  Your doctor will share a Meeting ID before the consultation.
                </p>
              </div>

              <form onSubmit={handleJoin} className="px-7 pb-7 space-y-4">
                <div>
                  <label htmlFor="meetingId" className="block text-sm font-semibold text-gray-700 mb-2">
                    Meeting ID
                  </label>
                  <input
                    id="meetingId"
                    type="text"
                    value={meetingId}
                    onChange={handleInput}
                    placeholder="e.g. abc-defg-hij"
                    autoComplete="off"
                    spellCheck={false}
                    className={`w-full px-4 py-3.5 rounded-xl border text-gray-900 font-mono text-base placeholder:font-sans placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      error
                        ? "border-red-300 focus:ring-red-200 bg-red-50"
                        : "border-gray-200 focus:ring-teal-200 focus:border-teal-400 bg-white"
                    }`}
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                      <AlertIcon className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!meetingId.trim()}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <VideoIcon className="w-5 h-5" />
                  Join Meeting
                </button>
              </form>
            </div>
          </div>

          {/* Tips panel */}
          <div className="md:col-span-2 space-y-4">

            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
              <p className="text-teal-700 font-semibold text-sm mb-3">Before you join</p>
              <ul className="space-y-2.5">
                {[
                  "Make sure your camera and microphone are working",
                  "Use a stable internet connection for best quality",
                  "Find a quiet, well-lit space for your appointment",
                  "Have your medical records ready if needed",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5 text-sm text-teal-800">
                    <CheckCircleIcon className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-gray-700 font-semibold text-sm mb-3">Need help?</p>
              <p className="text-gray-500 text-sm leading-relaxed">
                If you don&apos;t have a Meeting ID, please contact the clinic or check your appointment confirmation email.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 mt-3 text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                <HomeIcon className="w-4 h-4" />
                Back to clinic site
              </a>
            </div>

            {/* Doctor card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <DoctorIcon className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm">Dr. Amelia Carter</p>
                <p className="text-gray-500 text-xs mt-0.5">Cardiologist · Online</p>
              </div>
              <div className="ml-auto w-2.5 h-2.5 rounded-full bg-green-400" title="Available" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function VideoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function LinkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function AlertIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function HomeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function DoctorIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
