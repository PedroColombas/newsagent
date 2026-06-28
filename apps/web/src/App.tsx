import { lazy, Suspense, useRef, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { usePreferences } from "./hooks/usePreferences";
import { AppShell } from "./components/AppShell";
import { FullPlayer } from "./components/FullPlayer";
import { Onboarding } from "./pages/Onboarding";
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
    <Routes>
      {/* Full-screen reading view — no bottom nav. Lazy-loaded (react-markdown). */}
      <Route
        path="report/:date"
        element={
          <Suspense fallback={<Splash />}>
            <Report />
          </Suspense>
        }
      />
      {/* Everything else → the tabbed shell, which owns the animated tab routes. */}
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}

function Splash() {
  return <div className="flex h-full items-center justify-center text-[var(--faint)]">Loading…</div>;
}
