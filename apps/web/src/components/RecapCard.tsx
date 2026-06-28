import type { ReportRecap } from "@shared/types";

// "While you were away" card — shown at the top of the brief when the user missed days.
export function RecapCard({ recap }: { recap: ReportRecap }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--accent)]">
          While you were away
        </span>
        <span className="text-[11px] text-[var(--faint)]">
          · {recap.days} {recap.days === 1 ? "day" : "days"}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-[var(--ink)]/85">
        {recap.summary}
      </p>
    </div>
  );
}
