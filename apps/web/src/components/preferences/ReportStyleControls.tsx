import type { Preferences } from "@shared/types";
import { Segmented } from "../ui/Segmented";
import { Chip } from "../ui/Chip";
import { REPORT_MODES, VOICES, RECENCY_OPTIONS } from "../../lib/preferences-options";

export function ReportStyleControls({
  prefs,
  update,
}: {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="px-1 text-[13.5px] font-semibold">Format</span>
        <Segmented
          options={REPORT_MODES}
          value={prefs.report_mode}
          onChange={(report_mode) => update({ report_mode })}
        />
        <span className="px-1 text-[12px] text-[var(--faint)]">
          {REPORT_MODES.find((m) => m.value === prefs.report_mode)?.hint}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-1 text-[13.5px] font-semibold">Voice &amp; tone</span>
        <div className="flex flex-wrap gap-2">
          {VOICES.map((v) => (
            <Chip
              key={v.value}
              label={v.label}
              selected={prefs.voice === v.value}
              onClick={() => update({ voice: v.value })}
            />
          ))}
        </div>
        <span className="px-1 text-[12px] text-[var(--faint)]">
          {VOICES.find((v) => v.value === prefs.voice)?.hint}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-1 text-[13.5px] font-semibold">Recency</span>
        <Segmented
          options={RECENCY_OPTIONS}
          value={prefs.default_recency}
          onChange={(default_recency) => update({ default_recency })}
        />
        <span className="px-1 text-[12px] text-[var(--faint)]">
          How far back each report looks.{" "}
          {RECENCY_OPTIONS.find((r) => r.value === prefs.default_recency)?.hint}.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[13.5px] font-semibold">Sections per report</span>
          <div className="flex items-center gap-3">
            <StepButton
              label="−"
              disabled={prefs.max_topics <= 3}
              onClick={() => update({ max_topics: Math.max(3, prefs.max_topics - 1) })}
            />
            <span className="w-4 text-center text-[15px] font-semibold tabular-nums">
              {prefs.max_topics}
            </span>
            <StepButton
              label="+"
              disabled={prefs.max_topics >= 10}
              onClick={() => update({ max_topics: Math.min(10, prefs.max_topics + 1) })}
            />
          </div>
        </div>
        <span className="px-1 text-[12px] text-[var(--faint)]">
          How many topics your brief covers (3–10), most specific first.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-1 text-[13.5px] font-semibold">Exclude</span>
        <textarea
          value={prefs.exclusions}
          onChange={(e) => update({ exclusions: e.target.value })}
          rows={2}
          placeholder="Anything to leave out? e.g. nothing about crypto"
          className="resize-none rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-[14px] outline-none placeholder:text-[var(--faint)] focus:border-[var(--accent)]"
        />
      </div>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[18px] leading-none text-[var(--ink)] disabled:opacity-40"
    >
      {label}
    </button>
  );
}
