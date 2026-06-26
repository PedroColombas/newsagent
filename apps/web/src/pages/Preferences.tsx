import type { ReactNode } from "react";
import { usePreferences } from "../hooks/usePreferences";
import { toggleGenre, toggleSubtopic } from "../lib/preferences-actions";
import { MAX_GENRES } from "../lib/preferences-options";
import { GenrePicker } from "../components/preferences/GenrePicker";
import { SubtopicPicker } from "../components/preferences/SubtopicPicker";
import { CustomInterestsEditor } from "../components/preferences/CustomInterestsEditor";
import { ReportStyleControls } from "../components/preferences/ReportStyleControls";
import { Toggle } from "../components/ui/Toggle";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[1.1px] text-[var(--faint)]">
      {children}
    </span>
  );
}

export function Preferences() {
  const { prefs, loading, status, update } = usePreferences();

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

      {/* Genres */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between px-1">
          <SectionLabel>Genres</SectionLabel>
          <span className="text-[12.5px] text-[var(--faint)]">
            {prefs.genres.length} of {MAX_GENRES}
          </span>
        </div>
        <GenrePicker selected={prefs.genres} onToggle={(g) => toggleGenre(prefs, update, g)} />
      </div>

      {/* Subtopics — dynamically suggested per genre */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)] p-4">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.6px] text-[var(--accent)]">
          Subtopics · from your genres
        </span>
        <SubtopicPicker
          genres={prefs.genres}
          subtopics={prefs.subtopics}
          onToggle={(genre, sub) => toggleSubtopic(prefs, update, genre, sub)}
        />
      </div>

      {/* Custom interests */}
      <div className="flex flex-col gap-3">
        <div className="px-1">
          <SectionLabel>Custom interests</SectionLabel>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            Anything specific, in your own words — interpreted fresh each day.
          </p>
        </div>
        <CustomInterestsEditor
          interests={prefs.custom_interests ?? []}
          onChange={(custom_interests) => update({ custom_interests })}
        />
      </div>

      {/* Report style */}
      <div className="flex flex-col gap-5">
        <SectionLabel>Report style</SectionLabel>
        <ReportStyleControls prefs={prefs} update={update} />
      </div>

      {/* Daily podcast */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">Daily podcast</span>
          <span className="text-[12px] text-[var(--muted)]">A conversational audio version of your report</span>
        </div>
        <Toggle checked={prefs.podcast_enabled} onChange={(podcast_enabled) => update({ podcast_enabled })} />
      </div>
    </section>
  );
}
