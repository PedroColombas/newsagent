// Subscription tiers — the single source of truth for what each tier can do, shared by the app
// (paywall + feature gating) and the pipeline (cron cadence + podcast gating). Per-user tier/status
// lives in the `subscriptions` table (migration 0013); PRICES here are display-only — the real
// charge is configured in Stripe.
import type { Tier, SubscriptionStatus } from "./types";

export interface TierInfo {
  label: string; // display name
  blurb: string; // one-line description
  priceMonthly: number; // USD/month — DISPLAY ONLY (Stripe holds the source-of-truth price)
  cadence: "weekly" | "daily"; // weekly = Monday brief only; daily = weekdays Mon–Fri
  podcast: boolean; // audio version available
  onDemand: boolean; // may trigger "generate now"
}

// Launch pricing (2026-07): free weekly / $8 daily text / $14 studio. See billing-plan memo.
export const TIERS: Record<Tier, TierInfo> = {
  free: {
    label: "Weekly",
    blurb: "A Monday brief to start the week.",
    priceMonthly: 0,
    cadence: "weekly",
    podcast: false,
    onDemand: false,
  },
  text: {
    label: "Daily",
    blurb: "A fresh brief every weekday.",
    priceMonthly: 8,
    cadence: "daily",
    podcast: false,
    onDemand: true,
  },
  studio: {
    label: "Studio",
    blurb: "Daily briefs plus the podcast.",
    priceMonthly: 14,
    cadence: "daily",
    podcast: true,
    onDemand: true,
  },
};

// A subscription grants access while active or in trial; anything else lapses to free.
export function isEntitled(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

// The tier to gate on: a lapsed/canceled paid sub falls back to free access.
export function effectiveTier(tier: Tier, status: SubscriptionStatus): Tier {
  return isEntitled(status) ? tier : "free";
}

// Does this tier get an automatic brief on the given weekday? (UTC getUTCDay: 0=Sun … 6=Sat.)
// free = Monday only; daily tiers = Mon–Fri. (The cron already excludes weekends globally.)
export function generatesOnWeekday(tier: Tier, weekday: number): boolean {
  if (TIERS[tier].cadence === "weekly") return weekday === 1; // Monday
  return weekday >= 1 && weekday <= 5; // Mon–Fri
}
