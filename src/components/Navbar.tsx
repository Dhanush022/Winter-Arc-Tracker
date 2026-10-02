"use client";

import { useAuth } from "./AuthProvider";
import { AnimatedTopDock } from "@/shaders/animated-top-dock/AnimatedTopDock";

export default function Navbar() {
  const { profile, user } = useAuth();

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

      {/* Bottom Sable dock — follows the authored ThreeUI design */}
      <div className="fixed inset-x-0 bottom-0 z-50 sm:hidden winter-dock-mobile">
        <AnimatedTopDock
          variant="sable"
          proximity={122}
          spring={0.19}
          damping={0.70}
          widthGrowth={17}
          heightGrowth={16}
          drop={3.5}
        />
      </div>
    </>
  );
}
