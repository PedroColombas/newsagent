import type { Preferences } from "@shared/types";
import { Segmented } from "../ui/Segmented";
import { Chip } from "../ui/Chip";
import { REPORT_MODES, VOICES } from "../../lib/preferences-options";

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
    </div>
  );
}

