import { useState, type ReactNode } from "react";
import type { Preferences as Prefs } from "@shared/types";
import { usePreferences } from "../hooks/usePreferences";
import { useLatestReport } from "../hooks/useLatestReport";
import { requestTodayBrief } from "../lib/api";
import { markPending } from "../lib/pending-generation";
import { DeliveryTimeSelect } from "../components/preferences/DeliveryTimeSelect";
import { TopicManager } from "../components/preferences/TopicManager";
import { Toggle } from "../components/ui/Toggle";
import { Coachmarks } from "../components/Coachmarks";
import { MAX_TOPICS } from "../lib/preferences-options";
import { useSetup } from "../lib/setup";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[1.1px] text-[var(--faint)]">
      {children}
    </span>
  );
}

export function Preferences() {
  const { prefs, loading, status, update, markTipsSeen } = usePreferences();
  const setup = useSetup();
  const { report } = useLatestReport();
  const [topicsChanged, setTopicsChanged] = useState(false);
  const [regen, setRegen] = useState<"idle" | "submitting" | "done">("idle");

  if (loading || !prefs) {
    return <div className="px-6 py-10 text-[14px] text-[var(--faint)]">Loading your preferences…</div>;
  }

  const statusLabel =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Couldn't save"
          : "";

  // Only prompt to regenerate when today's brief already exists and was built with the OLD topics.
  // If there's no brief yet (before delivery, or a fresh day), the changes apply on the next run.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const todayComplete = report?.date === todayUtc && report.status === "complete";

  // Wrap the topic manager's update: a change to the topic SET (add / edit / remove) means today's
  // brief is now stale, so offer to regenerate. A bare reorder (topic_order only) doesn't change
  // the news, so it stays silent — the new order just applies next run.
  const topicUpdate = (patch: Partial<Prefs>) => {
    const contentChange =
      "genres" in patch || "subtopics" in patch || "custom_interests" in patch;
    if (contentChange) {
      setTopicsChanged(true);
      if (regen === "done") setRegen("idle"); // a further edit re-opens the prompt
    }
    update(patch);
  };

  async function regenerate() {
    if (!report) return;
    setRegen("submitting");
    // Prime the reload bridge so Today shows the compiling state the instant the user switches to it
    // (before fetch-news reclaims the row), same as the first-run generate flow.
    markPending(report.created_at);
    try {
      await requestTodayBrief(true);
      setRegen("done");
    } catch {
      setRegen("idle"); // let them try again
    }
  }

  return (
    <section className="flex flex-col gap-7 px-5 pb-10 pt-7">
      <div className="flex items-baseline justify-between px-1">
        <h1 className="text-[28px] font-bold tracking-tight">Preferences</h1>
        {statusLabel && (
          <span
            className={`text-[12.5px] font-medium ${
              status === "error" ? "text-red-600 dark:text-red-400" : "text-[var(--faint)]"
            }`}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Your topics — each is a section; drag to reorder, tap to edit, or add */}
      <div className="flex flex-col gap-3" data-tour="prefs-topics">
        <div className="px-1">
          <SectionLabel>Your topics</SectionLabel>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            Each is a section in your brief. Drag to reorder, tap to edit, or add your own.
          </p>
          {prefs.is_demo && (
            <p className="mt-1.5 text-[12.5px] font-medium text-[var(--accent)]">
              Have a play — you're in the demo, changes here aren't saved.
            </p>
          )}
        </div>
        {topicsChanged && todayComplete && (
          <RegenBanner
            state={regen}
            onRegenerate={regenerate}
            onDismiss={() => setTopicsChanged(false)}
          />
        )}
        <TopicManager prefs={prefs} update={topicUpdate} />
      </div>

      {/* Delivery time */}
      <div className="flex items-center justify-between px-1" data-tour="prefs-delivery">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">Delivery time</span>
          <span className="text-[12px] text-[var(--muted)]">When your brief lands each day, in your local time</span>
        </div>
        <DeliveryTimeSelect
          valueUtc={prefs.delivery_hour}
          onChange={(delivery_hour) => update({ delivery_hour })}
        />
      </div>

      {/* Daily podcast */}
      <div className="flex items-center justify-between px-1" data-tour="prefs-podcast">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">Daily podcast</span>
          <span className="text-[12px] text-[var(--muted)]">A conversational audio version of your report</span>
        </div>
        <Toggle checked={prefs.podcast_enabled} onChange={(podcast_enabled) => update({ podcast_enabled })} />
      </div>

      {/* Replay of the setup wizard — otherwise the screen that does the most to explain the
          product is only ever seen once, on a first run. */}
      {setup && (
        <button
          onClick={setup.openSetup}
          className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-3.5 text-left active:opacity-70"
        >
          <span className="block text-[14.5px] font-semibold">See how this was set up</span>
          <span className="mt-0.5 block text-[12px] text-[var(--muted)]">
            Walk through the setup wizard again
          </span>
        </button>
      )}

      {/* Coach marks teach a returning user over time. A demo visitor arrives already briefed by
          the landing page and has about ninety seconds, so bubbles only get in their way. */}
      {!prefs.is_demo && (
        <Coachmarks
          seen={prefs.tips_seen ?? []}
          onSeen={markTipsSeen}
          tips={[
            {
              key: "prefs-topics",
              target: '[data-tour="prefs-topics"]',
              placement: "below", // sit under the topic cards, pointing up, so it never covers them
              title: "Your topics",
              body: `These are the sections of your brief. Drag to reorder, tap to edit, or add up to ${MAX_TOPICS}.`,
            },
            {
              key: "prefs-delivery",
              target: '[data-tour="prefs-delivery"]',
              title: "Delivery time",
              body: "Choose when your brief lands each morning, in your local time.",
            },
            {
              key: "prefs-podcast",
              target: '[data-tour="prefs-podcast"]',
              title: "Daily podcast",
              body: "Turn on an audio version and it'll appear on Today, ready to play.",
            },
          ]}
        />
      )}
    </section>
  );
}

function RegenBanner({
  state,
  onRegenerate,
  onDismiss,
}: {
  state: "idle" | "submitting" | "done";
  onRegenerate: () => void;
  onDismiss: () => void;
}) {
  if (state === "done") {
    return (
      <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/8 p-3.5">
        <p className="text-[13px] font-medium leading-relaxed text-[var(--ink)]">
          Regenerating today's brief — it'll appear on Today in a minute or two.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/8 p-3.5">
      <div>
        <p className="text-[13.5px] font-semibold text-[var(--ink)]">Topics changed</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
          Today's brief used your previous topics. Regenerate it now, or your changes apply from
          tomorrow.
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onRegenerate}
          disabled={state === "submitting"}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-[var(--on-accent)] disabled:opacity-50"
        >
          {state === "submitting" ? "Starting…" : "Regenerate today"}
        </button>
        <button onClick={onDismiss} className="px-3 py-2 text-[13px] font-semibold text-[var(--muted)]">
          Wait till tomorrow
        </button>
      </div>
    </div>
  );
}
