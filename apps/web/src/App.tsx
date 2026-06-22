import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { AppShell } from "./components/AppShell";
import { Login } from "./pages/Login";
import { Today } from "./pages/Today";
import { History } from "./pages/History";
import { Preferences } from "./pages/Preferences";
import { Profile } from "./pages/Profile";

export function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-400">Loading…</div>;
  }

  // Logged out → magic-link login. Logged in → the tabbed app shell.
  if (!session) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Today />} />
        <Route path="history" element={<History />} />
        <Route path="preferences" element={<Preferences />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
