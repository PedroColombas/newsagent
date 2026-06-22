import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "Today", end: true },
  { to: "/history", label: "History", end: false },
  { to: "/preferences", label: "Preferences", end: false },
  { to: "/profile", label: "Profile", end: false },
];

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 grid grid-cols-4 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex items-center justify-center py-3 text-xs font-medium ${
              isActive
                ? "text-sky-600 dark:text-sky-400"
                : "text-slate-500 dark:text-slate-400"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
