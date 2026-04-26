"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Meeting = {
  id: string;
  code: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
};

function formatExpiry(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DoctorVideoConsultationPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<{ meetingId: string; expiresAt: string } | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    const res = await fetch("/api/admin/meetings");
    if (res.ok) {
      const data = await res.json();
      setRecentMeetings(data.meetings ?? []);
    }
    setLoadingMeetings(false);
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const res = await fetch("/api/video/create-room", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create meeting");

      const expiresAt = new Date(Date.now() + 7_200_000).toISOString();
      setActiveMeeting({ meetingId: data.meetingId, expiresAt });
      loadMeetings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create meeting");
    } finally {
      setCreating(false);
    }
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleJoin(meetingId: string) {
    router.push(`/video-room/${meetingId}`);
  }

  async function handleDeactivate(id: string) {
    await fetch("/api/admin/meetings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadMeetings();
  }

  return (
    <div className="min-h-full bg-slate-950 px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Page header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <VideoIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Video Consultation</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">Create a meeting room and share the ID with your patient</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <CloseIcon />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Create / Active meeting */}
          <div className="lg:col-span-3 space-y-4">

            {/* Create card */}
            {!activeMeeting ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
                  <VideoIcon className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-white font-bold text-xl mb-2">Start a New Consultation</h2>
                <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
                  Create a secure video room. Share the meeting ID with your patient so they can join.
                </p>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/40 active:scale-95"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Room…
                    </>
                  ) : (
                    <>
                      <PlusIcon />
                      Create Meeting
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Active meeting card */
              <div className="bg-slate-900 border border-blue-500/30 rounded-2xl overflow-hidden shadow-xl shadow-blue-900/20">
                <div className="bg-blue-600/10 border-b border-blue-500/20 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 text-sm font-semibold">Meeting Ready</span>
                  </div>
                  <span className="text-slate-500 text-xs">{formatExpiry(activeMeeting.expiresAt)}</span>
                </div>

                <div className="px-6 py-6 space-y-5">
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-2">Meeting ID</p>
                    <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                      <code className="text-blue-300 font-mono text-lg font-bold flex-1 tracking-wider break-all">
                        {activeMeeting.meetingId}
                      </code>
                      <button
                        onClick={() => handleCopy(activeMeeting.meetingId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          copied
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600"
                        }`}
                      >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-slate-600 text-xs mt-2">Share this ID with your patient. The room expires in 2 hours.</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleJoin(activeMeeting.meetingId)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/40 active:scale-95"
                    >
                      <VideoIcon className="w-5 h-5" />
                      Join Meeting
                    </button>
                    <button
                      onClick={() => setActiveMeeting(null)}
                      className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-xl transition-colors text-sm"
                    >
                      New
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-5">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">How it works</p>
              <div className="space-y-3">
                {[
                  { step: "1", text: "Click Create Meeting to generate a secure room" },
                  { step: "2", text: "Copy the Meeting ID and send it to your patient" },
                  { step: "3", text: "Click Join Meeting — your patient joins using the same ID" },
                  { step: "4", text: "After the call, write a prescription directly from the call screen" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-xs font-bold">{step}</span>
                    </div>
                    <p className="text-slate-400 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Recent meetings */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Recent Meetings</h3>
                <button
                  onClick={loadMeetings}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  title="Refresh"
                >
                  <RefreshIcon />
                </button>
              </div>

              {loadingMeetings ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : recentMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <VideoIcon className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-slate-500 text-sm">No meetings yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50 max-h-[480px] overflow-y-auto">
                  {recentMeetings.map((m) => {
                    const expired = new Date(m.expires_at).getTime() < Date.now();
                    return (
                      <div key={m.id} className="px-5 py-4 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <code className="text-slate-300 font-mono text-xs break-all flex-1 leading-relaxed">
                            {m.code}
                          </code>
                          <span
                            className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              expired || !m.is_active
                                ? "bg-slate-800 text-slate-500 border-slate-700"
                                : "bg-green-500/10 text-green-400 border-green-500/20"
                            }`}
                          >
                            {expired || !m.is_active ? "Expired" : "Active"}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mb-3">{formatDate(m.created_at)}</p>
                        {!expired && m.is_active && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleJoin(m.code)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg transition-colors"
                            >
                              <VideoIcon className="w-3.5 h-3.5" />
                              Join
                            </button>
                            <button
                              onClick={() => handleCopy(m.code)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs rounded-lg transition-colors"
                            >
                              <CopyIcon />
                            </button>
                            <button
                              onClick={() => handleDeactivate(m.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 text-slate-500 hover:text-red-400 text-xs rounded-lg transition-colors"
                              title="Deactivate"
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
