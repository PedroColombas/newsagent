import { useEffect, useRef, useState } from "react";
import { fetchSubtopicSuggestions } from "../lib/api";

/**
 * Fetches subtopic chips for each selected genre (once per genre, cached).
 * Returns suggestions keyed by genre + a per-genre loading flag.
 */
export function useSubtopicSuggestions(genres: string[]) {
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const genre of genres) {
      if (requested.current.has(genre)) continue;
      requested.current.add(genre);
      setLoading((l) => ({ ...l, [genre]: true }));
      fetchSubtopicSuggestions(genre).then((subs) => {
        setSuggestions((s) => ({ ...s, [genre]: subs }));
        setLoading((l) => ({ ...l, [genre]: false }));
      });
    }
  }, [genres]);

  return { suggestions, loading };
}
