import type { SubtopicMap } from "@shared/types";
import { Chip } from "../ui/Chip";
import { useSubtopicSuggestions } from "../../hooks/useSubtopicSuggestions";

// Per-genre suggestion chips. Renders the union of fetched suggestions + already-selected
// subtopics, so a previously-picked subtopic always stays visible and toggleable.
export function SubtopicPicker({
  genres,
  subtopics,
  onToggle,
}: {
  genres: string[];
  subtopics: SubtopicMap;
  onToggle: (genre: string, sub: string) => void;
}) {
  const { suggestions, loading } = useSubtopicSuggestions(genres);

  if (genres.length === 0) {
    return <p className="text-[13px] text-[var(--muted)]">Pick a genre first to see subtopic suggestions.</p>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {genres.map((genre) => {
        const chips = Array.from(
          new Set([...(suggestions[genre] ?? []), ...(subtopics[genre] ?? [])]),
        );
        return (
          <div key={genre} className="flex flex-col gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[1px] text-[var(--faint)]">
              {genre}
            </span>
            {loading[genre] && chips.length === 0 ? (
              <span className="text-[12.5px] text-[var(--faint)]">Finding subtopics…</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {chips.map((sub) => (
                  <Chip
                    key={sub}
                    label={sub}
                    size="sm"
                    selected={(subtopics[genre] ?? []).includes(sub)}
                    onClick={() => onToggle(genre, sub)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
