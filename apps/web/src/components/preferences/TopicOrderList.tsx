import { useEffect, useState } from "react";
import { Reorder } from "motion/react";
import type { Preferences } from "@shared/types";
import { planReportSections, sectionKey, type PlannedTopic } from "@shared/plan-topics";

function describeSection(s: PlannedTopic): string {
  if (s.level === 3) return "Custom interest";
  if (s.level === 2) return `${s.genre} · subtopic`;
  return "Genre overview";
}

// Drag-to-reorder list of the report's sections. Persists the order as prefs.topic_order (which
// planReportSections — shared with the pipeline — honours). Used in the onboarding review and on
// the Preferences page.
export function TopicOrderList({
  prefs,
  update,
}: {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
}) {
  const [ordered, setOrdered] = useState<PlannedTopic[]>(() => planReportSections(prefs));

  // Re-sync when the SET of topics changes (genres/subtopics/interests/cap edited on the same
  // screen) — but NOT on a bare reorder (that's this list's own drag). The signal ignores order.
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
        Add a genre or interest to start shaping your brief.
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
          className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 active:cursor-grabbing"
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--accent)]/12 text-[12px] font-bold text-[var(--accent)]">
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-semibold leading-snug">{s.topic}</span>
            <span className="text-[11.5px] text-[var(--faint)]">{describeSection(s)}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" className="flex-none text-[var(--faint)]" aria-hidden>
            <path d="M5 9h14M5 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
