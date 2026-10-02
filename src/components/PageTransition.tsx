"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

const TAB_ORDER = ["/dashboard", "/habits", "/macros", "/sleep", "/leaderboard", "/profile"];

let lastIndex = 0;

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const idx = TAB_ORDER.indexOf(pathname);
  const forward = idx === -1 || idx >= lastIndex;
  if (idx >= 0) lastIndex = idx;

  const enterX = forward ? 40 : -40;
  const exitX = forward ? -40 : 40;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: enterX }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: exitX }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
