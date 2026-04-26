"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import VideoConsultation, { type ConnectionState } from "./VideoConsultation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id:   string;
  text: string;
  from: "patient" | "system";
  time: string;
}

export interface PatientConsultationPageProps {
  meetingId:  string;
  token:      string;
  userId:     string;
  userName:   string;
  doctorName: string;
  onEnd?:     () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientConsultationPage({
  meetingId, token, userId, userName, doctorName, onEnd,
}: PatientConsultationPageProps) {
  const [elapsed,     setElapsed]     = useState(0);
  const [connState,   setConnState]   = useState<ConnectionState>("connecting");
  const [chatOpen,    setChatOpen]    = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft,       setDraft]       = useState("");
  const [messages,    setMessages]    = useState<Message[]>([
    { id: "sys-0", text: "Messages are visible only during this session.", from: "system", time: "" },
  ]);

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connState === "connected") {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connState]);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  const handleEndRequest = useCallback(() => setConfirmOpen(true), []);

  const confirmEnd = useCallback(() => {
    setConfirmOpen(false);
    onEnd?.();
  }, [onEnd]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { id: `msg-${Date.now()}`, text, from: "patient", time }]);
    setDraft("");
  }, [draft]);

  return (
    <div className="relative h-full w-full">

      {/* ── VideoConsultation — full-width, no doctor panel ──────────────────── */}
      <VideoConsultation
        meetingId={meetingId}
        token={token}
        userId={userId}
        userName={userName}
        hidePanel
        onEndRequest={handleEndRequest}
        onConnectionStateChange={setConnState}
      />

      {/* ── Top overlay bar ──────────────────────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
        <div className="flex items-center justify-between px-4 pt-3 pb-8 bg-gradient-to-b from-black/70 to-transparent">

          {/* Doctor info */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-teal-600 ring-2 ring-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{doctorName}</p>
              <p className="text-white/40 text-[11px]">Your Doctor</p>
            </div>
          </div>

          {/* Timer + connection pill */}
          <div className="flex items-center gap-2">
            {connState === "connected" && elapsed > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/80 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
                <span className="text-white text-xs font-semibold tabular-nums">{fmtTime(elapsed)}</span>
              </div>
            )}
            <ConnectionPill state={connState} />
          </div>
        </div>
      </div>

      {/* ── Chat toggle button ────────────────────────────────────────────────── */}
      <div className="absolute bottom-[80px] right-4 z-20">
        <button
          onClick={() => setChatOpen((o) => !o)}
          title={chatOpen ? "Close messages" : "Open messages"}
          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
            chatOpen
              ? "bg-teal-500 text-white"
              : "bg-[#3c4043]/95 backdrop-blur-sm text-white hover:bg-[#4a4d51]/95"
          }`}
        >
          <ChatIcon />
        </button>
      </div>

      {/* ── Chat panel ───────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-x-4 bottom-[80px] z-30 transition-all duration-300 origin-bottom ${
          chatOpen
            ? "opacity-100 scale-y-100 pointer-events-auto"
            : "opacity-0 scale-y-95 pointer-events-none"
        }`}
        style={{ maxHeight: "min(320px, calc(100% - 160px))" }}
      >
        <div className="h-full bg-[#2d2e30]/98 backdrop-blur-md border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] flex-shrink-0">
            <div className="flex items-center gap-2">
              <ChatIcon className="w-4 h-4 text-teal-400" />
              <span className="text-white text-sm font-semibold">Messages</span>
              <span className="text-white/25 text-xs">· session only</span>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === "patient" ? "justify-end" : "justify-center"}`}>
                {msg.from === "system" ? (
                  <p className="text-white/25 text-[11px] text-center py-1">{msg.text}</p>
                ) : (
                  <div className="max-w-[75%]">
                    <div className="bg-teal-600 text-white text-sm px-3 py-1.5 rounded-2xl rounded-br-sm">
                      {msg.text}
                    </div>
                    <p className="text-white/25 text-[10px] text-right mt-0.5">{msg.time}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input row */}
          <div className="flex gap-2 px-3 py-2.5 border-t border-white/[0.07] flex-shrink-0">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Type a message…"
              className="flex-1 bg-white/5 text-white text-sm rounded-xl px-3 py-2 border border-white/10 focus:border-teal-500/60 focus:outline-none placeholder:text-white/25"
            />
            <button
              onClick={sendMessage}
              disabled={!draft.trim()}
              className="w-9 h-9 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-white/5 disabled:text-white/20 text-white flex items-center justify-center transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── End-call confirmation modal ───────────────────────────────────────── */}
      {confirmOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="bg-[#2d2e30] border border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl">

            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </div>

            <h3 className="text-white text-lg font-bold text-center mb-1">Leave consultation?</h3>
            <p className="text-white/40 text-sm text-center mb-6">
              Your session with{" "}
              <span className="text-white/70 font-medium">{doctorName}</span> will end.
              {elapsed > 0 && (
                <> Duration so far: <span className="font-semibold text-white/60">{fmtTime(elapsed)}</span>.</>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors"
              >
                Stay in call
              </button>
              <button
                onClick={confirmEnd}
                className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
              >
                Leave call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConnectionPill({ state }: { state: ConnectionState }) {
  const cfg: Record<ConnectionState, { dot: string; label: string }> = {
    connecting:   { dot: "bg-amber-400 animate-pulse", label: "Connecting"   },
    connected:    { dot: "bg-green-400",               label: "Live"         },
    reconnecting: { dot: "bg-amber-400 animate-pulse", label: "Reconnecting" },
    disconnected: { dot: "bg-red-500",                 label: "Disconnected" },
  };
  const { dot, label } = cfg[state];
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      <span className="text-white/70 text-[11px] font-semibold">{label}</span>
    </div>
  );
}

function ChatIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
