import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

// Mobile-first single-column shell: scrollable content + a fixed bottom nav in the
// thumb zone. max-w-md keeps it phone-width when viewed on a larger screen.
export function AppShell() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-[var(--paper)]">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
