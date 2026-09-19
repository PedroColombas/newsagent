import { useEffect, useRef } from "react";
import { Routes, Route, Navigate, type Location } from "react-router-dom";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { usePreferences } from "../hooks/usePreferences";
import { DemoBanner } from "./DemoBanner";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "./MiniPlayer";
import { Today } from "../pages/Today";
import { History } from "../pages/History";
import { Preferences } from "../pages/Preferences";
import { Profile } from "../pages/Profile";

// Tab order drives slide direction: moving to a tab on the right slides left, and vice-versa.
const TAB_ORDER = ["/", "/preferences", "/history", "/profile"];
function tabIndex(pathname: string) {
  const i = TAB_ORDER.indexOf(pathname);
  return i === -1 ? 0 : i;
}

const slide: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%" }),
};

// Mobile-first single-column shell: a sliding tab pane + a fixed bottom nav in the thumb zone.
// Takes its location as a prop (not useLocation) so it can stay mounted as the base layer
// while a report slides over it — rendering the last tab, never the report path.
export function AppShell({ location }: { location: Location }) {
  const idx = tabIndex(location.pathname);
  const { prefs } = usePreferences();

  // Previous tab index, updated AFTER commit (not during render) so it's StrictMode-safe.
  const prevIdx = useRef(idx);
  const direction = idx - prevIdx.current;
  useEffect(() => {
    prevIdx.current = idx;
  }, [idx]);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-[var(--paper)]">
      {prefs?.is_demo && <DemoBanner />}
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={location.pathname}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 overflow-y-auto"
          >
            <Routes location={location}>
              <Route index element={<Today />} />
              <Route path="history" element={<History />} />
              <Route path="preferences" element={<Preferences />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
