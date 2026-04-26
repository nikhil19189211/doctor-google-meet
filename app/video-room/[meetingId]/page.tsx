"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import VideoConsultation from "@/components/VideoConsultation";
import PrescriptionForm from "@/components/PrescriptionForm";
import Link from "next/link";

type RoomState = "lobby" | "connecting" | "live" | "ended" | "error";

type SessionData = {
  token: string;
  isDoctor: boolean;
  userName: string;
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VideoRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const router = useRouter();

  const [roomState, setRoomState] = useState<RoomState>("lobby");
  const [session,   setSession]   = useState<SessionData | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [elapsed,   setElapsed]   = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const decodedId = decodeURIComponent(meetingId);

  // Fetch VideoSDK token
  useEffect(() => {
    async function init() {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        router.replace(`/login?redirect=/video-room/${meetingId}`);
        return;
      }

      const res = await fetch("/api/video/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ meetingId: decodedId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to prepare meeting");
        setRoomState("error");
        return;
      }

      setSession({ token: data.token, isDoctor: data.isDoctor, userName: data.userName });
    }
    init();
  }, [meetingId, decodedId, router]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, []);

  useEffect(() => {
    if (roomState === "live") startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [roomState, startTimer]);

  const handleJoin = useCallback(() => {
    setRoomState("connecting");
    setTimeout(() => setRoomState("live"), 200);
  }, []);

  const handleEnd = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRoomState("ended");
  }, []);

  function formatTime(s: number) {
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  // ─── Error screen ────────────────────────────────────────────────────────────
  if (roomState === "error") {
    return (
      <div className="fixed inset-0 bg-[#202124] flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertIcon className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <p className="text-white font-bold text-xl">Cannot Join Meeting</p>
          <p className="text-white/40 text-sm mt-2 max-w-sm">{error}</p>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-full transition-colors"
          >
            Go back
          </button>
          <Link
            href="/patient/video-consultation"
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full transition-colors"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  // ─── Ended screen ────────────────────────────────────────────────────────────
  if (roomState === "ended") {
    const isDoc = session?.isDoctor;
    return (
      <div className="fixed inset-0 bg-[#202124] flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <CheckCircleIcon className="w-10 h-10 text-teal-400" />
        </div>
        <div>
          <p className="text-white font-bold text-2xl">Call Ended</p>
          <p className="text-white/40 text-sm mt-1">
            Duration:&nbsp;
            <span className="text-white/60 font-mono">{formatTime(elapsed)}</span>
          </p>
        </div>
        {isDoc ? (
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link
              href="/admin/dashboard/appointments"
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-full transition-colors"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/admin/dashboard/prescriptions"
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full transition-colors shadow-lg shadow-teal-900/40"
            >
              <PrescriptionIcon />
              Write Prescription
            </Link>
          </div>
        ) : (
          <Link
            href="/patient/appointments"
            className="mt-2 flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full transition-colors"
          >
            <CalendarIcon />
            My Appointments
          </Link>
        )}
      </div>
    );
  }

  // ─── Lobby / Loading ─────────────────────────────────────────────────────────
  if (!session || roomState === "lobby") {
    const loading = !session;
    return (
      <div className="fixed inset-0 bg-[#202124] flex flex-col">

        {/* Top bar */}
        <header className="h-14 border-b border-white/[0.07] flex items-center px-5 gap-4 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
          >
            <BackIcon />
          </button>
          <div className="flex items-center gap-2">
            <VideoIcon className="w-4 h-4 text-white/30" />
            <span className="text-white/50 text-sm font-medium">Video Consultation</span>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Preparing your room…</p>
          </div>
        ) : (
          /* ── Google Meet-style pre-join layout ── */
          <div className="flex-1 flex items-center justify-center px-6 py-10">
            <div className="w-full max-w-2xl flex flex-col lg:flex-row gap-8 items-center">

              {/* Camera preview card */}
              <div className="flex-1 w-full max-w-sm">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#3c4043] flex items-center justify-center shadow-2xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-teal-600/80 flex items-center justify-center ring-4 ring-white/10">
                      <span className="text-white text-3xl font-medium select-none">
                        {session.userName.trim()[0]?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm">{session.userName}</p>
                  </div>
                  {/* Corner badge */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-white/70 text-[11px] font-medium">
                      {session.isDoctor ? "Doctor (Host)" : "Patient"}
                    </span>
                  </div>
                </div>

                {/* Device check row */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  {[
                    { icon: <MicCheckIcon />, label: "Mic" },
                    { icon: <CamCheckIcon />, label: "Camera" },
                    { icon: <WifiIcon />,     label: "Network" },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                        {icon}
                      </div>
                      <span className="text-white/30 text-[10px]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Join info panel */}
              <div className="flex-1 w-full max-w-xs space-y-5">
                <div>
                  <h1 className="text-white font-bold text-2xl mb-1">
                    {session.isDoctor ? "Your meeting is ready" : "Ready to join?"}
                  </h1>
                  <p className="text-white/40 text-sm">
                    {session.isDoctor
                      ? "You're the host. Start whenever you're ready."
                      : "Your doctor is waiting for you."}
                  </p>
                </div>

                {/* Meeting ID chip */}
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mb-1">Meeting ID</p>
                  <p className="text-white/70 font-mono text-xs break-all">{decodedId}</p>
                </div>

                <button
                  onClick={handleJoin}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-semibold rounded-full transition-all shadow-lg shadow-teal-900/30 text-sm"
                >
                  <VideoIcon className="w-4 h-4" />
                  Join now
                </button>

                <p className="text-white/20 text-xs text-center">
                  By joining, you agree to our consultation terms.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Live call ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#202124] flex flex-col">

      {/* Minimal top info bar */}
      <header className="h-12 bg-[#202124] border-b border-white/[0.06] flex items-center px-5 gap-3 flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">Live</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <span className="text-white/40 text-xs font-mono tabular-nums">{formatTime(elapsed)}</span>
        <div className="flex-1" />
        <span className="text-white/20 text-xs font-mono truncate max-w-[200px]" title={decodedId}>
          {decodedId.slice(0, 24)}{decodedId.length > 24 ? "…" : ""}
        </span>
      </header>

      {/* Video area — fills remaining height */}
      <div className="flex-1 min-h-0">
        <VideoConsultation
          meetingId={decodedId}
          token={session.token}
          userName={session.userName}
          onEnd={handleEnd}
          hidePanel={!session.isDoctor}
          doctorPanel={
            session.isDoctor
              ? <PrescriptionForm draftKey={`rx-draft-${decodedId}`} />
              : undefined
          }
        />
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

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function AlertIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PrescriptionIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function MicCheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function CamCheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  );
}
