import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Reorder } from "motion/react";
import type { Preferences } from "@shared/types";
import { GENRES, SUBTOPIC_FALLBACK } from "../../lib/preferences-options";
import {
  topicEntries,
  entryKey,
  entryLabel,
  entryTypeLabel,
  addEntry,
  editEntry,
  removeEntry,
  type TopicEntry,
} from "../../lib/topic-actions";

// The report's topics, managed directly: drag to reorder, tap a card to edit (genre + optional
// focus, or your own words), or remove. Replaces the separate genre / subtopic / custom pickers.
export function TopicManager({
  prefs,
  update,
}: {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
}) {
  const [entries, setEntries] = useState<TopicEntry[]>(() => topicEntries(prefs));
  const [editing, setEditing] = useState<TopicEntry | "new" | null>(null);

  // Re-sync the list when the SET of topics changes (add/edit/delete) — not on a bare reorder.
  const setSignal = topicEntries(prefs).map(entryKey).sort().join("|");
  useEffect(() => {
    setEntries(topicEntries(prefs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSignal]);

  return (
    <div className="flex flex-col gap-2">
      {entries.length > 0 && (
        <Reorder.Group
          axis="y"
          values={entries}
          onReorder={(next) => {
            setEntries(next);
            update({ topic_order: next.map(entryKey) });
          }}
          className="flex flex-col gap-2"
        >
          {entries.map((e, i) => (
            <Reorder.Item
              key={entryKey(e)}
              value={e}
              className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 active:cursor-grabbing"
            >
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--accent)]/12 text-[12px] font-bold text-[var(--accent)]">
                {i + 1}
              </span>
              <button onClick={() => setEditing(e)} className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-[14px] font-semibold leading-snug">{entryLabel(e)}</span>
                <span className="text-[11.5px] text-[var(--faint)]">{entryTypeLabel(e)}</span>
              </button>
              <svg width="16" height="16" viewBox="0 0 24 24" className="flex-none text-[var(--faint)]" aria-hidden>
                <path d="M5 9h14M5 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      <button
        onClick={() => setEditing("new")}
        className="rounded-2xl border border-dashed border-[var(--line)] py-3 text-[13.5px] font-semibold text-[var(--muted)] active:opacity-60"
      >
        + Add topic
      </button>

      {editing && (
        <TopicEditSheet
          prefs={prefs}
          update={update}
          entry={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TopicEditSheet({
  prefs,
  update,
  entry,
  onClose,
}: {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  entry: TopicEntry | null; // null = adding
  onClose: () => void;
}) {
  const isNew = entry === null;
  const [mode, setMode] = useState<"genre" | "custom">(entry?.kind === "custom" ? "custom" : "genre");
  const [genre, setGenre] = useState(entry && entry.kind !== "custom" ? entry.genre : "");
  const [sub, setSub] = useState(entry?.kind === "subtopic" ? entry.sub : "");
  const [text, setText] = useState(entry?.kind === "custom" ? entry.text : "");

  const suggestions = genre ? SUBTOPIC_FALLBACK[genre] ?? [] : [];
  const canSave = mode === "custom" ? text.trim().length > 0 : genre.length > 0;

  function save() {
    let next: TopicEntry;
    if (mode === "custom") {
      if (!text.trim()) return;
      next = { kind: "custom", text: text.trim() };
    } else {
      if (!genre) return;
      next = sub.trim() ? { kind: "subtopic", genre, sub: sub.trim() } : { kind: "genre", genre };
    }
    update(isNew ? addEntry(prefs, next) : editEntry(prefs, entry, next));
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-md rounded-t-3xl border-t border-[var(--line)] bg-[var(--paper)] p-5 pb-8"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[var(--line)]" />
        <h3 className="text-[17px] font-bold tracking-tight">{isNew ? "Add a topic" : "Edit topic"}</h3>

        {isNew && (
          <div className="mt-3 flex gap-1 rounded-full bg-[var(--line)]/60 p-0.5">
            {(["genre", "custom"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-1.5 text-[12.5px] font-medium ${
                  mode === m ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"
                }`}
              >
                {m === "genre" ? "By genre" : "Your own words"}
              </button>
            ))}
          </div>
        )}

        {mode === "genre" ? (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--faint)]">Genre</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenre(g)}
                    className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${
                      genre === g
                        ? "bg-[var(--accent)] text-[var(--on-accent)]"
                        : "border border-[var(--line)] text-[var(--muted)]"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--faint)]">
                Focus (optional)
              </span>
              <input
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                placeholder="e.g. AI chips — blank for the whole genre"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-[14px] outline-none placeholder:text-[var(--faint)] focus:border-[var(--accent)]"
              />
              {suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {suggestions.map((sg) => (
                    <button
                      key={sg}
                      onClick={() => setSub(sg)}
                      className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11.5px] text-[var(--muted)]"
                    >
                      {sg}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--faint)]">Topic</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Anything, in your own words — e.g. what China is doing in chip development"
              className="mt-2 w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-[14px] outline-none placeholder:text-[var(--faint)] focus:border-[var(--accent)]"
            />
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          {!isNew && (
            <button
              onClick={() => {
                update(removeEntry(prefs, entry));
                onClose();
              }}
              className="text-[14px] font-semibold text-red-600 dark:text-red-400"
            >
              Remove
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-2 py-2 text-[14px] font-semibold text-[var(--muted)]">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-[var(--on-accent)] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
