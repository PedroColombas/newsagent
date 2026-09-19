import { useCallback, useEffect, useRef, useState } from "react";
import type { Report, PodcastEpisode } from "@shared/types";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

/**
 * Loads the user's most recent report (by date) plus its podcast episode, if any.
 * Reports + episodes are read-only from the frontend (RLS scopes to the user's rows).
 * `refetch` re-reads on demand — used to poll while an on-demand brief is compiling.
 */
export function useLatestReport() {
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [lastComplete, setLastComplete] = useState<Report | null>(null);
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1);

    if (!mounted.current) return;
    const latest = (reports?.[0] as Report | undefined) ?? null;
    setReport(latest);

    // The newest row isn't always a readable brief - it can be mid-generation or failed. When it
    // isn't, also pull the most recent one that IS, so a failure can be shown OVER the last good
    // brief instead of replacing the whole screen with an error the user cannot clear.
    let complete: Report | null = latest?.status === "complete" ? latest : null;
    if (!complete) {
      const { data: done } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "complete")
        .order("date", { ascending: false })
        .limit(1);
      if (!mounted.current) return;
      complete = (done?.[0] as Report | undefined) ?? null;
    }
    setLastComplete(complete);

    // The episode belongs to whichever brief is actually on screen.
    const shown = complete ?? latest;
    if (shown) {
      const { data: eps } = await supabase
        .from("podcast_episodes")
        .select("*")
        .eq("report_id", shown.id)
        .limit(1);
      if (mounted.current) setEpisode((eps?.[0] as PodcastEpisode | undefined) ?? null);
    } else if (mounted.current) {
      setEpisode(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void refetch().finally(() => {
      if (mounted.current) setLoading(false);
    });
  }, [user, refetch]);

  return { report, lastComplete, episode, loading, refetch };
}
