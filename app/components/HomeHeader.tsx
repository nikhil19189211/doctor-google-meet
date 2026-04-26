"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomeHeader() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; isDoctor: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const doctorEmail = process.env.NEXT_PUBLIC_DOCTOR_EMAIL;

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name ?? data.user.email ?? "User";
        setUser({ name, isDoctor: data.user.email === doctorEmail });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name ?? session.user.email ?? "User";
        setUser({ name, isDoctor: session.user.email === doctorEmail });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-8 bg-gray-100 rounded-full animate-pulse" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:block text-sm text-gray-600 font-medium">
          Hi, {user.name.split(" ")[0]}
        </span>
        <Link
          href={user.isDoctor ? "/admin/dashboard" : "/patient"}
          className="text-sm font-medium text-teal-700 border border-teal-300 rounded-full px-4 py-1.5 hover:bg-teal-50 transition-colors"
        >
          Dashboard
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-rose-600 border border-rose-200 rounded-full px-4 py-1.5 hover:bg-rose-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="text-sm font-medium text-teal-700 border border-teal-300 rounded-full px-4 py-1.5 hover:bg-teal-50 transition-colors">
        Login
      </Link>
      <Link href="/signup" className="hidden sm:inline-flex text-sm font-medium text-white bg-teal-600 rounded-full px-4 py-1.5 hover:bg-teal-700 transition-colors">
        Sign Up
      </Link>
      <Link href="/book" className="text-sm font-medium text-white bg-rose-500 rounded-full px-4 py-1.5 hover:bg-rose-600 transition-colors shadow-sm">
        Book Appointment
      </Link>
    </div>
  );
}
