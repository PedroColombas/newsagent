import { useEffect, useState } from "react";
import { Reorder } from "motion/react";
import type { Preferences } from "@shared/types";
import { planReportSections, sectionKey, type PlannedTopic } from "@shared/plan-topics";
import { removeEntry, type TopicEntry } from "../../lib/topic-actions";

function describeSection(s: PlannedTopic): string {
  return s.level === 3 ? "Your own words" : (s.genre ?? "");
}

// A PlannedTopic (from the shared planner) → a TopicEntry (for the mutation helpers).
function toEntry(s: PlannedTopic): TopicEntry {
  return s.level === 3
    ? { kind: "custom", text: s.topic }
    : { kind: "subtopic", genre: s.genre ?? "", sub: s.topic };
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2m1 0-1 14H7L6 6" />
    </svg>
  );
}

// Drag-to-reorder + delete list of the report's sections. Persists order as prefs.topic_order (which
// planReportSections — shared with the pipeline — honours). Used in the onboarding review.
export function TopicOrderList({
  prefs,
  update,
}: {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
}) {
  const [ordered, setOrdered] = useState<PlannedTopic[]>(() => planReportSections(prefs));

  // Re-sync when the SET of topics changes (edited/deleted on the same screen) — but NOT on a bare
  // reorder (that's this list's own drag). The signal ignores order.
  const setSignal = planReportSections({ ...prefs, topic_order: [] })
    .map(sectionKey)
    .sort()
    .join("|");
  useEffect(() => {
    setOrdered(planReportSections(prefs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSignal]);

  if (ordered.length === 0) {
    return (
      <p className="px-1 text-[13px] text-[var(--muted)]">
        Add a subtopic or interest to start shaping your brief.
      </p>
    );
  }

  return (
    <Reorder.Group
      axis="y"
      values={ordered}
      onReorder={(next) => {
        setOrdered(next);
        update({ topic_order: next.map(sectionKey) });
      }}
      className="flex flex-col gap-2"
    >
      {ordered.map((s, i) => (
        <Reorder.Item
          key={sectionKey(s)}
          value={s}
          className="flex items-center gap-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 active:cursor-grabbing"
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--accent)]/12 text-[12px] font-bold text-[var(--accent)]">
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] font-semibold leading-snug">{s.topic}</span>
            <span className="text-[11.5px] text-[var(--faint)]">{describeSection(s)}</span>
          </div>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              update(removeEntry(prefs, toEntry(s)));
            }}
            aria-label={`Delete ${s.topic}`}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[var(--faint)] active:bg-red-500/10 active:text-red-600"
          >
            <TrashIcon />
          </button>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
