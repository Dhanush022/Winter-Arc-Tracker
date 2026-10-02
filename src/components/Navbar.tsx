"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { signOut } from "@/lib/supabase";
import { AnimatedTopDock } from "@/shaders/animated-top-dock/AnimatedTopDock";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/habits", label: "Habits", icon: "✅" },
  { href: "/macros", label: "Macros", icon: "🍗" },
  { href: "/sleep", label: "Sleep", icon: "🌙" },
  { href: "/leaderboard", label: "Ranks", icon: "🏆" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function Navbar() {
  const { profile, user } = useAuth();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <>
      {/* Top dock — variants on sm+ */}
      <div className="winter-dock fixed top-0 left-0 right-0 z-50 hidden sm:block">
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
          <div className="hidden sm:flex fixed top-4 left-4 z-50 items-center gap-2 px-3 py-1.5 rounded-md bg-surface-light">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: profile?.avatar_color || "#ea580c" }}
            >
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </div>
            <span className="text-sm text-muted">
              {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}
            </span>
          </div>
        )}
      </div>

      {/* Bottom tab bar — mobile only, same dark-glass pill design */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-surface-border bg-background/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  active ? "text-accent-orange" : "text-muted"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center justify-center gap-0.5 py-2 flex-1 text-[10px] font-mono uppercase tracking-wider text-muted transition-colors hover:text-white"
          >
            <span className="text-base leading-none">🚪</span>
            Exit
          </button>
        </div>
      </nav>
    </>
  );
}
