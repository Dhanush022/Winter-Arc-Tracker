"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import LeaderboardList from "@/components/LeaderboardList";
import { useRouter } from "next/navigation";

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent-teal text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <Navbar />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-accent-orange text-xs tracking-widest mb-2">THE PUBLIC RANKS</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
            WHO KEPT THEIR WORD?
          </h1>
          <div className="flex justify-center">
            <span className="text-accent-teal text-3xl">🏅</span>
          </div>
        </div>

        <LeaderboardList />

        {/* Footer */}
        <footer className="mt-12 flex items-center justify-center gap-2 text-muted-dark text-xs tracking-widest">
          <span>❄</span>
          WINTER ARC · BUILT FOR THE SEASON NOBODY SEES
        </footer>
      </div>
    </div>
  );
}
