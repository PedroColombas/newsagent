import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Reorder } from "motion/react";
import type { Preferences } from "@shared/types";
import { planReportSections, countCandidateSections, sectionKey, type PlannedTopic } from "@shared/plan-topics";
import { toggleGenre, toggleSubtopic } from "../lib/preferences-actions";
import { REPORT_MODES, VOICES } from "../lib/preferences-options";
import { GenrePicker } from "../components/preferences/GenrePicker";
import { SubtopicPicker } from "../components/preferences/SubtopicPicker";
import { CustomInterestsEditor } from "../components/preferences/CustomInterestsEditor";
import { ReportStyleControls } from "../components/preferences/ReportStyleControls";
import { Toggle } from "../components/ui/Toggle";
import { WelcomeCarousel } from "../components/WelcomeCarousel";

const STEPS = [
  { title: "Pick your genres", subtitle: "The broad areas you want covered — up to five." },
  {
    title: "Choose your angles",
    subtitle: "Subtopics within each genre, suggested from what's in the news now.",
  },
  { title: "Anything specific?", subtitle: "Add interests in your own words — optional." },
  { title: "How should it read?", subtitle: "Shape the format, voice, and how new topics are introduced." },
];

export function Onboarding({
  prefs,
  update,
  onDone,
}: {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  onDone: () => void;
}) {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const total = STEPS.length;

  // Trailer first — set the scene before the config wizard.
  if (!started) return <WelcomeCarousel onDone={() => setStarted(true)} />;

  function finish(to: string) {
    onDone();
    navigate(to);
  }

  if (step === total) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col px-6 pb-8 pt-6">
        <EditionPreview
          prefs={prefs}
          update={update}
          onBack={() => setStep(total - 1)}
          onStart={() => finish("/")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-6 pb-8 pt-5">
      {/* Progress */}
      <div className="flex flex-none items-center gap-1.5 pt-1">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}
          />
        ))}
      </div>

      <div className="mt-5 flex-none">
        <span className="text-[12px] font-bold uppercase tracking-[1px] text-[var(--accent)]">
          Step {step + 1} of {total}
        </span>
        <h1 className="mt-2 text-[25px] font-bold leading-tight tracking-tight">{STEPS[step].title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">{STEPS[step].subtitle}</p>
      </div>

      {/* Body */}
      <div className="mt-6 flex-1 overflow-y-auto">
        {step === 0 && (
          <GenrePicker selected={prefs.genres} onToggle={(g) => toggleGenre(prefs, update, g)} />
        )}
        {step === 1 && (
          <SubtopicPicker
            genres={prefs.genres}
            subtopics={prefs.subtopics}
            onToggle={(genre, sub) => toggleSubtopic(prefs, update, genre, sub)}
          />
        )}
        {step === 2 && (
          <CustomInterestsEditor
            interests={prefs.custom_interests ?? []}
            onChange={(custom_interests) => update({ custom_interests })}
          />
        )}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <ReportStyleControls prefs={prefs} update={update} />
            <div className="flex items-center justify-between border-t border-[var(--line)] pt-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14.5px] font-semibold">Daily podcast</span>
                <span className="text-[12px] text-[var(--muted)]">A conversational audio version</span>
              </div>
              <Toggle
                checked={prefs.podcast_enabled}
                onChange={(podcast_enabled) => update({ podcast_enabled })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex flex-none items-center gap-3 pt-4">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-2xl border border-[var(--line)] px-5 py-3.5 text-[15px] font-semibold text-[var(--muted)]"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={() => setStep(step + 1)}
          className="flex-1 rounded-2xl bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-[var(--on-accent)]"
        >
          {step === total - 1 ? "Review" : "Continue"}
        </button>
      </div>
    </div>
  );
}

function describeSection(s: PlannedTopic): string {
  if (s.level === 3) return "Custom interest";
  if (s.level === 2) return `${s.genre} · subtopic`;
  return "Genre overview";
}

function PreviewTag({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
        accent ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"
      }`}
    >
      {children}
    </span>
  );
}

function EditionPreview({
  prefs,
  update,
  onBack,
  onStart,
}: {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const modeLabel = REPORT_MODES.find((m) => m.value === prefs.report_mode)?.label;
  const voiceLabel = VOICES.find((v) => v.value === prefs.voice)?.label;
  const [ordered, setOrdered] = useState(() => planReportSections(prefs));
  const candidates = countCandidateSections(prefs);
  const trimmed = candidates > ordered.length;

  function reorder(next: PlannedTopic[]) {
    setOrdered(next);
    update({ topic_order: next.map(sectionKey) });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none">
        <span className="text-[12px] font-bold uppercase tracking-[0.8px] text-[var(--accent)]">All set</span>
        <h1 className="mt-3 text-[25px] font-bold leading-tight tracking-tight">Here's tomorrow's edition</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">
          Your brief will run {ordered.length} {ordered.length === 1 ? "section" : "sections"}. Drag to reorder.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {modeLabel && <PreviewTag>{modeLabel}</PreviewTag>}
          {voiceLabel && <PreviewTag>{voiceLabel}</PreviewTag>}
          {prefs.podcast_enabled && <PreviewTag accent>Podcast</PreviewTag>}
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto">
        <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--faint)]">
          In this edition
        </span>
        {ordered.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--muted)]">
            No topics picked yet — go back and add a genre or two to shape your brief.
          </p>
        ) : (
          <Reorder.Group
            axis="y"
            values={ordered}
            onReorder={reorder}
            className="mt-3 flex flex-col gap-2"
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
        )}
        {trimmed && (
          <p className="mt-3 px-1 text-[12px] leading-relaxed text-[var(--muted)]">
            Showing {ordered.length} of {candidates} topics (most specific kept). Raise “Sections per report” to
            include more.
          </p>
        )}
      </div>

      <div className="flex flex-none items-center gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-[var(--line)] px-5 py-3.5 text-[15px] font-semibold text-[var(--muted)]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onStart}
          className="flex-1 rounded-2xl bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-[var(--on-accent)]"
        >
          Start reading
        </button>
      </div>
    </div>
  );
}
