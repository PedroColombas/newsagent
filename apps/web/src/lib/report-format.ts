import type { User } from "@supabase/supabase-js";

// "2026-06-27" -> "Saturday · 27 June" (parsed as local, not UTC midnight).
export function formatReportDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  const rest = d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  return `${weekday} · ${rest}`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// First name from auth metadata, else the email's leading segment, title-cased.
export function displayName(user: User | null): string {
  const full = user?.user_metadata?.full_name;
  if (typeof full === "string" && full.trim()) return full.trim().split(" ")[0];
  const local = (user?.email ?? "").split("@")[0].split(/[._-]/)[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
}

export function estimateReadMinutes(texts: string[]): number {
  const words = texts.reduce((n, t) => n + t.trim().split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.round(words / 200));
}

// A clean one-line preview of a section's write-up (strips light markdown, truncates).
export function snippet(summary: string, max = 180): string {
  const text = summary
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
    .replace(/[#*_>`]/g, "") // emphasis / heading marks
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
