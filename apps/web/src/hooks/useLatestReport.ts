import { useEffect, useState } from "react";
import type { Report, PodcastEpisode } from "@shared/types";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

/**
 * Loads the user's most recent report (by date) plus its podcast episode, if any.
 * Reports + episodes are read-only from the frontend (RLS scopes to the user's rows).
 */
export function useLatestReport() {
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);

    (async () => {
      const { data: reports } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1);

      if (!active) return;
      const latest = (reports?.[0] as Report | undefined) ?? null;
      setReport(latest);

      if (latest) {
        const { data: eps } = await supabase
          .from("podcast_episodes")
          .select("*")
          .eq("report_id", latest.id)
          .limit(1);
        if (active) setEpisode((eps?.[0] as PodcastEpisode | undefined) ?? null);
      }
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  return { report, episode, loading };
}
