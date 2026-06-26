import type { ReactNode } from "react";
import { usePreferences } from "../hooks/usePreferences";
import { useSubtopicSuggestions } from "../hooks/useSubtopicSuggestions";
import { Chip } from "../components/ui/Chip";
import { Segmented } from "../components/ui/Segmented";
import { Toggle } from "../components/ui/Toggle";
import {
  GENRES,
  REPORT_MODES,
  VOICES,
  RECENCY_OPTIONS,
  MAX_GENRES,
  MAX_INTERESTS,
} from "../lib/preferences-options";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[1.1px] text-[var(--faint)]">
      {children}
    </span>
  );
}

export function Preferences() {
  const { prefs, loading, status, update } = usePreferences();
  const genres = prefs?.genres ?? [];
  const { suggestions, loading: subLoading } = useSubtopicSuggestions(genres);

  if (loading || !prefs) {
    return <div className="px-6 py-10 text-[14px] text-[var(--faint)]">Loading your preferences…</div>;
  }

  const interests = prefs.custom_interests ?? [];

  function toggleGenre(genre: string) {
    if (genres.includes(genre)) {
      const subtopics = { ...prefs!.subtopics };
      delete subtopics[genre];
      const recency_by_genre = { ...prefs!.recency_by_genre };
      delete recency_by_genre[genre];
      update({ genres: genres.filter((g) => g !== genre), subtopics, recency_by_genre });
    } else if (genres.length < MAX_GENRES) {
      update({ genres: [...genres, genre] });
    }
  }

  function toggleSubtopic(genre: string, sub: string) {
    const current = prefs!.subtopics[genre] ?? [];
    const next = current.includes(sub) ? current.filter((s) => s !== sub) : [...current, sub];
    update({ subtopics: { ...prefs!.subtopics, [genre]: next } });
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
      {/* Header */}
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
            {genres.length} of {MAX_GENRES}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <Chip key={g} label={g} selected={genres.includes(g)} onClick={() => toggleGenre(g)} />
          ))}
        </div>
      </div>

      {/* Subtopics — dynamically suggested per genre */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)] p-4">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.6px] text-[var(--accent)]">
          Subtopics · from your genres
        </span>
        {genres.length === 0 ? (
          <p className="text-[13px] text-[var(--muted)]">Pick a genre above to see subtopic suggestions.</p>
        ) : (
          genres.map((genre) => {
            const chips = Array.from(
              new Set([...(suggestions[genre] ?? []), ...(prefs.subtopics[genre] ?? [])]),
            );
            return (
              <div key={genre} className="flex flex-col gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-[1px] text-[var(--faint)]">
                  {genre}
                </span>
                {subLoading[genre] && chips.length === 0 ? (
                  <span className="text-[12.5px] text-[var(--faint)]">Finding subtopics…</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {chips.map((sub) => (
                      <Chip
                        key={sub}
                        label={sub}
                        size="sm"
                        selected={(prefs.subtopics[genre] ?? []).includes(sub)}
                        onClick={() => toggleSubtopic(genre, sub)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Custom interests */}
      <div className="flex flex-col gap-3">
        <div className="px-1">
          <SectionLabel>Custom interests</SectionLabel>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            Anything specific, in your own words — interpreted fresh each day.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {interests.map((interest, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={interest}
                onChange={(e) => {
                  const next = [...interests];
                  next[i] = e.target.value;
                  update({ custom_interests: next });
                }}
                placeholder="e.g. what China is doing in chip development"
                className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-[14px] outline-none placeholder:text-[var(--faint)] focus:border-[var(--accent)]"
              />
              <button
                type="button"
                aria-label="Remove interest"
                onClick={() => update({ custom_interests: interests.filter((_, j) => j !== i) })}
                className="flex-none rounded-xl border border-[var(--line)] px-3 py-2.5 text-[var(--faint)]"
              >
                ✕
              </button>
            </div>
          ))}
          {interests.length < MAX_INTERESTS && (
            <button
              type="button"
              onClick={() => update({ custom_interests: [...interests, ""] })}
              className="self-start text-[13.5px] font-semibold text-[var(--accent)]"
            >
              + Add an interest
            </button>
          )}
        </div>
      </div>

      {/* Report style */}
      <div className="flex flex-col gap-5">
        <SectionLabel>Report style</SectionLabel>

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
            How far back each report looks. {RECENCY_OPTIONS.find((r) => r.value === prefs.default_recency)?.hint}.
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
