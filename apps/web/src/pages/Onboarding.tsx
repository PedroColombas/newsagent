import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Preferences } from "@shared/types";
import { planReportSections } from "@shared/plan-topics";
import { toggleGenre, toggleSubtopic } from "../lib/preferences-actions";
import { MAX_TOPICS } from "../lib/preferences-options";
import { topicCount } from "../lib/topic-actions";
import { GenrePicker } from "../components/preferences/GenrePicker";
import { SubtopicPicker } from "../components/preferences/SubtopicPicker";
import { CustomInterestsEditor } from "../components/preferences/CustomInterestsEditor";
import { Toggle } from "../components/ui/Toggle";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { TopicManager } from "../components/preferences/TopicManager";

const STEPS = [
  { title: "Pick your areas", subtitle: "Broad areas to explore — you'll choose specific topics next. Up to five." },
  {
    title: "Choose your topics",
    subtitle: "These become the sections of your brief — pick the ones you care about.",
  },
  { title: "Anything specific?", subtitle: "Add topics in your own words — optional." },
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
  const count = topicCount(prefs);
  const atCap = count >= MAX_TOPICS;

  // Welcome screen first — a warm hello before the config wizard.
  if (!started) return <WelcomeScreen onStart={() => setStarted(true)} />;

  function finish(to: string) {
    onDone();
    navigate(to);
  }

  if (step === total) {
    return (
      <div className="mx-auto h-full max-w-md overflow-y-auto px-6 pb-8 pt-6">
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
          <div className="flex flex-col gap-3">
            <CapNotice atCap={atCap} />
            <SubtopicPicker
              genres={prefs.genres}
              subtopics={prefs.subtopics}
              onToggle={(genre, sub) => toggleSubtopic(prefs, update, genre, sub)}
            />
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <CapNotice atCap={atCap} />
            <CustomInterestsEditor
              interests={prefs.custom_interests ?? []}
              onChange={(custom_interests) => update({ custom_interests })}
              atCap={atCap}
            />
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

// Only the cap notice, and only once it bites. There used to be a running count beside it, but the
// count covers subtopics AND custom interests while each step shows only one of the two — so it
// read "4 of 4 topics" next to three visible chips. The notice earns its place; the count did not,
// because a chip that silently stops responding still needs explaining.
function CapNotice({ atCap }: { atCap: boolean }) {
  if (!atCap) return null;
  return (
    <span className="px-1 text-[12px] text-[var(--faint)]">Limit reached — deselect one to swap</span>
  );
}

function MicIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3" />
    </svg>
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
  const sections = planReportSections(prefs);

  return (
    <div className="flex flex-col">
      <div>
        <span className="text-[12px] font-bold uppercase tracking-[0.8px] text-[var(--accent)]">All set</span>
        <h1 className="mt-3 text-[25px] font-bold leading-tight tracking-tight">Here's tomorrow's edition</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">
          Here's what your brief will cover. Drag to reorder, tap to edit, or remove any you don't want.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          {/* Podcast — a live on/off toggle (last chance to enable before the first brief) */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
                  prefs.podcast_enabled
                    ? "bg-[var(--accent)]/12 text-[var(--accent)]"
                    : "bg-[var(--line)]/60 text-[var(--faint)]"
                }`}
              >
                <MicIcon />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[1.1px] text-[var(--faint)]">
                  Podcast
                </span>
                <span className="text-[13.5px] font-semibold text-[var(--ink)]">
                  {prefs.podcast_enabled ? "On · daily audio version" : "Off · text only"}
                </span>
              </div>
            </div>
            <Toggle
              checked={prefs.podcast_enabled}
              onChange={(podcast_enabled) => update({ podcast_enabled })}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--faint)]">
          In this edition
        </span>
        <div className="mt-3">
          <TopicManager prefs={prefs} update={update} />
        </div>
      </div>

      {sections.length === 0 && (
        <p className="mt-4 text-center text-[12.5px] text-[var(--muted)]">
          Add at least one topic to continue — go back and pick a subtopic or add your own.
        </p>
      )}
      <div className="flex items-center gap-3 pt-6">
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
          disabled={sections.length === 0}
          className="flex-1 rounded-2xl bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-[var(--on-accent)] disabled:opacity-40"
        >
          Start reading
        </button>
      </div>
    </div>
  );
}
