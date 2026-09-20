// Appearance: follow the system, or override it.
//
// Stored in localStorage rather than the preferences table, for two reasons. A theme is a property
// of the device you are reading on, not of the account — the same person may want dark on a phone
// at 6am and light on a laptop. And preference writes are deliberately dropped for the demo
// account, so a database-backed toggle would flip back on the next load for exactly the visitor we
// most want it to work for.
//
// Applied by setting data-theme on <html>. index.html does this before React mounts, so the page
// never paints the wrong theme first; this module keeps it in sync afterwards.
export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "daily-theme";

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* private mode, or storage blocked — fall back to following the system */
  }
  return "system";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);

  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* the theme still applies for this session, it just will not be remembered */
  }
}
