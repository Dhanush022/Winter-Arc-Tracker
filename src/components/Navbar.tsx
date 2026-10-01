"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { signOut } from "@/lib/supabase";


export default function Navbar() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-surface-light flex items-center justify-center">
              <span className="text-accent-teal text-xs">❄</span>
            </div>
            <span className="font-bold text-sm text-white tracking-tight">WINTER ARC</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { href: "/dashboard", label: "Dashboard", icon: "📊" },
              { href: "/habits", label: "Habits", icon: "✅" },
              { href: "/macros", label: "Macros", icon: "🍗" },
              { href: "/sleep", label: "Sleep", icon: "🌙" },
              { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
              { href: "/profile", label: "Profile", icon: "👤" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                  pathname === link.href
                    ? "text-accent-teal bg-accent-teal/5"
                    : "text-muted hover:text-white"
                }`}
              >
                <span className="text-xs">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-light">
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
            <button
              onClick={handleSignOut}
              className="text-muted hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
