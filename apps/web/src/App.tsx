import { lazy, Suspense, useRef, useState } from "react";
import { Routes, Route, useLocation, type Location } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "./auth/AuthProvider";
import { usePreferences } from "./hooks/usePreferences";
import { AppShell } from "./components/AppShell";
import { FullPlayer } from "./components/FullPlayer";
import { Onboarding } from "./pages/Onboarding";
import { Walkthrough } from "./components/Walkthrough";
import { Login } from "./pages/Login";

// Lazy — the reading view pulls in react-markdown, which we don't want in the initial bundle.
const Report = lazy(() => import("./pages/Report").then((m) => ({ default: m.Report })));

export function App() {
  const { session, loading } = useAuth();

  if (loading) return <Splash />;
  // Logged out → sign in. Logged in → first-run gate, then the tabbed app.
  if (!session) return <Login />;
  return (
    <>
      <AuthedApp />
      <FullPlayer />
    </>
  );
}

function AuthedApp() {
  const { prefs, loading, update } = usePreferences();
  // Decide once, on load, whether this is a first run — so editing genres inside the
  // wizard doesn't immediately flip us out of it. Exit only when the wizard says so.
  const startedEmpty = useRef<boolean | null>(null);
  const [finishedOnboarding, setFinishedOnboarding] = useState(false);

  if (loading || !prefs) return <Splash />;
  if (startedEmpty.current === null) startedEmpty.current = prefs.genres.length === 0;

  if (startedEmpty.current && !finishedOnboarding) {
    return <Onboarding prefs={prefs} update={update} onDone={() => setFinishedOnboarding(true)} />;
  }

  return (
    <>
      <AuthedRoutes />
      {/* First-run coach marks, once, gated per-account. */}
      {!prefs.walkthrough_seen && (
        <Walkthrough onFinish={() => update({ walkthrough_seen: true })} />
      )}
    </>
  );
}

const HOME_LOCATION = { pathname: "/", search: "", hash: "", state: null, key: "default" } as Location;

// The tabbed shell is the base layer — always mounted at the last tab location, so it never
// redirects while a report is open. The reading view slides in over it from the right (iOS
// push) and back out to the right on return.
function AuthedRoutes() {
  const location = useLocation();
  const onReport = location.pathname.startsWith("/report/");
  // Keep the last tab location for the base shell. On a direct /report load, fall back to home.
  const lastTab = useRef<Location>(onReport ? HOME_LOCATION : location);
  if (!onReport) lastTab.current = location;

  return (
    <div className="relative h-full overflow-hidden">
      <AppShell location={lastTab.current} />
      <AnimatePresence>
        {onReport && (
          <motion.div
            key="report"
            className="absolute inset-0 z-30 bg-[var(--paper)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <Suspense fallback={<Splash />}>
              {/* Full-screen reading view — no bottom nav. Lazy-loaded (react-markdown). */}
              <Routes location={location}>
                <Route path="report/:date" element={<Report />} />
              </Routes>
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Splash() {
  return <div className="flex h-full items-center justify-center text-[var(--faint)]">Loading…</div>;
}
