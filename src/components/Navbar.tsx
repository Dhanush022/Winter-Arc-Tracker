"use client";

import { useAuth } from "./AuthProvider";
import { signOut } from "@/lib/supabase";
import { AnimatedTopDock } from "@/shaders/animated-top-dock/AnimatedTopDock";

export default function Navbar() {
  const { profile, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="winter-dock fixed top-0 left-0 right-0 z-50">
      <AnimatedTopDock
        variant="sable"
        proximity={122}
        spring={0.19}
        damping={0.70}
        widthGrowth={17}
        heightGrowth={16}
        drop={3.5}
      />
      <button
        onClick={handleSignOut}
        className="fixed top-4 right-4 z-50 text-muted hover:text-white transition-colors"
        aria-label="Sign out"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
      {(profile?.full_name || user?.email) && (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-light">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: profile?.avatar_color || "#64ffda" }}
          >
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
          </div>
          <span className="text-sm text-muted">
            {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}
          </span>
        </div>
      )}
    </div>
  );
}
