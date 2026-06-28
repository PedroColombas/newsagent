import { useEffect, useState } from "react";
import type { ReportContent, ReportStatus } from "@shared/types";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

// Lightweight per-report summary for the History list + calendar.
export interface ReportSummary {
  id: string;
  date: string;
  status: ReportStatus;
  topicCount: number;
  categories: string[];
  hasPodcast: boolean;
  read: boolean;
}

export function useReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);

    (async () => {
      // Skip the heavy `markdown` column; we only need section counts + categories here.
      const { data: rows } = await supabase
        .from("reports")
        .select("id, date, status, content")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      const { data: eps } = await supabase
        .from("podcast_episodes")
        .select("report_id")
        .eq("user_id", user.id);

      const { data: reads } = await supabase
        .from("report_reads")
        .select("report_id")
        .eq("user_id", user.id);

      if (!active) return;

      const podcastIds = new Set((eps ?? []).map((e: { report_id: string }) => e.report_id));
      const readIds = new Set((reads ?? []).map((r: { report_id: string }) => r.report_id));

      const summaries: ReportSummary[] = (rows ?? []).map(
        (r: { id: string; date: string; status: ReportStatus; content: ReportContent | null }) => {
          const sections = r.content?.sections ?? [];
          const categories = Array.from(
            new Set(sections.map((s) => s.category).filter((c): c is string => Boolean(c))),
          );
          return {
            id: r.id,
            date: r.date,
            status: r.status,
            topicCount: sections.length,
            categories,
            hasPodcast: podcastIds.has(r.id),
            read: readIds.has(r.id),
          };
        },
      );

      setReports(summaries);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  return { reports, loading };
}
