"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PatientConsultationPage from "@/components/PatientConsultationPage";
import VideoConsultation from "@/components/VideoConsultation";
import Link from "next/link";

type JoinData = { meetingId: string; token: string; isDoctor: boolean };

export default function ConsultRoomPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();

  const [joinData, setJoinData]   = useState<JoinData | null>(null);
  const [userName, setUserName]   = useState("Participant");
  const [userId,   setUserId]     = useState("");
  const [error,    setError]      = useState<string | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [ended,    setEnded]      = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace(`/login?redirect=/consult/${appointmentId}`);
        return;
      }

      const meta = session.user.user_metadata;
      setUserName(meta?.full_name || meta?.name || session.user.email || "Participant");
      setUserId(session.user.id);

      const res = await fetch("/api/consultation/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join consultation");
        setLoading(false);
        return;
      }

      setJoinData(data);
      setLoading(false);
    }

    init();
  }, [appointmentId, router]);

  const handleEnd = useCallback(() => {
    setEnded(true);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Preparing your consultation…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-lg">Cannot join consultation</p>
          <p className="text-slate-400 text-sm mt-1 max-w-xs">{error}</p>
        </div>
        <div className="flex gap-3 mt-2">
          <Link
            href="/patient/appointments"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            My Appointments
          </Link>
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (ended) {
    const isDoctor = joinData?.isDoctor;
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-lg">Consultation ended</p>
          <p className="text-slate-400 text-sm mt-1">The video call has been disconnected.</p>
        </div>
        <div className="flex gap-3 mt-2">
          {isDoctor ? (
            <>
              <Link
                href="/admin/dashboard/appointments"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Back to Dashboard
              </Link>
              <Link
                href={`/admin/dashboard/prescriptions?appointmentId=${appointmentId}`}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Write Prescription
              </Link>
            </>
          ) : (
            <Link
              href="/patient/appointments"
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              My Appointments
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!joinData) return null;

  // Doctor sees VideoConsultation with side panel; patient sees PatientConsultationPage
  if (joinData.isDoctor) {
    return (
      <div className="fixed inset-0 bg-slate-900">
        <VideoConsultation
          meetingId={joinData.meetingId}
          token={joinData.token}
          userId={userId}
          userName={userName}
          onEnd={handleEnd}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900">
      <PatientConsultationPage
        meetingId={joinData.meetingId}
        token={joinData.token}
        userId={userId}
        userName={userName}
        doctorName="Dr. Amelia Carter"
        onEnd={handleEnd}
      />
    </div>
  );
}
