"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MeetingProvider, useMeeting, useParticipant, VideoPlayer } from "@videosdk.live/react-sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface VideoConsultationProps {
  meetingId: string;
  token: string;
  userId?: string;
  userName: string;
  onEnd?: () => void;
  doctorPanel?: React.ReactNode;
  hidePanel?: boolean;
  onEndRequest?: () => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-600", "bg-violet-600", "bg-pink-600",
  "bg-amber-600", "bg-teal-600",  "bg-indigo-600",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── ParticipantTile ──────────────────────────────────────────────────────────

function ParticipantTile({ participantId }: { participantId: string }) {
  const { webcamOn, displayName, micOn, micStream, isLocal } = useParticipant(participantId);
  const audioRef = useRef<HTMLAudioElement>(null);
  const name    = displayName || "Participant";
  const initial = name.trim()[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (micOn && micStream && audioRef.current) {
      const ms = new MediaStream();
      ms.addTrack(micStream.track);
      audioRef.current.srcObject = ms;
      audioRef.current.play().catch(() => {});
    }
  }, [micStream, micOn]);

  return (
    <div className="relative w-full h-full min-h-[180px] rounded-2xl overflow-hidden bg-[#3c4043]">
      <audio ref={audioRef} autoPlay muted={isLocal} />

      {webcamOn ? (
        <VideoPlayer
          participantId={participantId}
          type="video"
          containerStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className={`w-20 h-20 rounded-full ${avatarColor(name)} flex items-center justify-center shadow-lg ring-2 ring-white/10`}>
            <span className="text-white text-3xl font-medium select-none">{initial}</span>
          </div>
        </div>
      )}

      {/* Bottom name strip */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2.5 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-1.5">
        {!micOn && (
          <div className="w-5 h-5 rounded-full bg-red-600/90 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          </div>
        )}
        <span className="text-white text-xs font-medium truncate drop-shadow-sm">
          {name}{isLocal ? " (You)" : ""}
        </span>
      </div>
    </div>
  );
}

// ─── MeetingView ──────────────────────────────────────────────────────────────

function MeetingView({
  onEnd, onEndRequest, doctorPanel, hidePanel, onConnectionStateChange,
}: {
  onEnd?: () => void;
  onEndRequest?: () => void;
  doctorPanel?: React.ReactNode;
  hidePanel?: boolean;
  onConnectionStateChange?: (state: ConnectionState) => void;
}) {
  const [joinState, setJoinState] = useState<"joining" | "joined" | "error">("joining");
  const [joinError, setJoinError] = useState<string | null>(null);

  const {
    join, leave,
    muteMic, unmuteMic,
    enableWebcam, disableWebcam,
    localMicOn, localWebcamOn, participants,
  } = useMeeting({
      onMeetingJoined: () => {
        setJoinState("joined");
        onConnectionStateChange?.("connected");
      },
      onMeetingLeft: () => {
        onConnectionStateChange?.("disconnected");
        onEnd?.();
      },
      onError: (err: { message?: string }) => {
        setJoinState("error");
        setJoinError(err?.message ?? "Connection error");
        onConnectionStateChange?.("disconnected");
      },
    });

  useEffect(() => {
    onConnectionStateChange?.("connecting");
    join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLeave = useCallback(() => leave(), [leave]);

  const handleToggleMic = useCallback(() => {
    if (localMicOn) muteMic(); else unmuteMic();
  }, [localMicOn, muteMic, unmuteMic]);

  const handleToggleWebcam = useCallback(() => {
    if (localWebcamOn) disableWebcam(); else enableWebcam();
  }, [localWebcamOn, enableWebcam, disableWebcam]);

  if (joinState === "error") {
    return (
      <div className="flex flex-col h-full bg-[#202124] items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <PhoneOffIcon className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-white font-semibold">Connection failed</p>
        <p className="text-white/40 text-sm">{joinError}</p>
        <button
          onClick={onEnd}
          className="mt-2 px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-full transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  if (joinState === "joining") {
    return (
      <div className="flex flex-col h-full bg-[#202124] items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Joining consultation…</p>
      </div>
    );
  }

  const participantIds = Array.from(participants.keys());

  return (
    <div className="flex flex-col h-full bg-[#202124] select-none">
      {/* Video area + doctor panel */}
      <div className="flex flex-1 min-h-0">

        {/* Participant grid */}
        <div className="flex-1 min-w-0 p-2">
          {participantIds.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-white/30">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <UserIcon className="w-8 h-8" />
              </div>
              <p className="text-sm">Waiting for others to join…</p>
            </div>
          ) : (
            <div
              className="h-full grid gap-2"
              style={{ gridTemplateColumns: participantIds.length > 1 ? "1fr 1fr" : "1fr" }}
            >
              {participantIds.map((id) => (
                <ParticipantTile key={id} participantId={id} />
              ))}
            </div>
          )}
        </div>

        {/* Doctor side panel */}
        {!hidePanel && (
          <div className="w-80 xl:w-96 border-l border-white/[0.07] bg-[#2d2e30] flex flex-col flex-shrink-0 overflow-hidden">
            {doctorPanel ?? <DoctorPanelPlaceholder />}
          </div>
        )}
      </div>

      {/* ── Google Meet-style controls bar ────────────────────────────────────── */}
      <div className="h-[72px] flex-shrink-0 bg-[#202124] border-t border-white/[0.06] flex items-center justify-between px-6">

        {/* Left cluster: Mic + Camera */}
        <div className="flex items-center gap-3">
          <GMControlBtn
            active={localMicOn}
            onClick={handleToggleMic}
            title={localMicOn ? "Turn off microphone" : "Turn on microphone"}
            activeIcon={<MicOnIcon />}
            inactiveIcon={<MicOffIcon />}
          />
          <GMControlBtn
            active={localWebcamOn}
            onClick={handleToggleWebcam}
            title={localWebcamOn ? "Turn off camera" : "Turn on camera"}
            activeIcon={<CameraOnIcon />}
            inactiveIcon={<CameraOffIcon />}
          />
        </div>

        {/* Center: Leave call pill */}
        <button
          onClick={onEndRequest ?? handleLeave}
          title="Leave call"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-medium text-sm transition-all shadow-lg shadow-red-900/30"
        >
          <PhoneOffIcon className="w-4 h-4" />
          <span>Leave call</span>
        </button>

        {/* Right cluster: participant count */}
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white/80 cursor-default transition-colors">
            <PeopleIcon />
            <span className="text-xs font-medium">{participantIds.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function VideoConsultation({
  meetingId, token, userName, onEnd, doctorPanel, hidePanel, onEndRequest, onConnectionStateChange,
}: VideoConsultationProps) {
  return (
    <MeetingProvider
      config={{ meetingId, micEnabled: true, webcamEnabled: true, name: userName, debugMode: false }}
      token={token}
    >
      <MeetingView
        onEnd={onEnd}
        onEndRequest={onEndRequest}
        doctorPanel={doctorPanel}
        hidePanel={hidePanel}
        onConnectionStateChange={onConnectionStateChange}
      />
    </MeetingProvider>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DoctorPanelPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
        <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-white/20 text-sm">Panel unavailable</p>
    </div>
  );
}

function GMControlBtn({
  active, onClick, title, activeIcon, inactiveIcon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
        active
          ? "bg-[#3c4043] hover:bg-[#4a4d51] text-white"
          : "bg-red-600 hover:bg-red-700 text-white"
      }`}
    >
      {active ? activeIcon : inactiveIcon}
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MicOnIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function MicOffIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

function CameraOnIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CameraOffIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function PhoneOffIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
