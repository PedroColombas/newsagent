import { useEffect, useState } from "react";
import type { Report, PodcastEpisode } from "@shared/types";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

/**
 * Loads a single report (by date) for the signed-in user, plus its podcast episode.
 * Reports are unique per (user_id, date) and read-only from the frontend (RLS-scoped).
 */
export function useReport(date: string | undefined) {
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !date) return;
    let active = true;
    setLoading(true);

    (async () => {
      const { data: reports } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .limit(1);

      if (!active) return;
      const found = (reports?.[0] as Report | undefined) ?? null;
      setReport(found);

      if (found) {
        const { data: eps } = await supabase
          .from("podcast_episodes")
          .select("*")
          .eq("report_id", found.id)
          .limit(1);
        if (active) setEpisode((eps?.[0] as PodcastEpisode | undefined) ?? null);
      }
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user, date]);

  return { report, episode, loading };
}
