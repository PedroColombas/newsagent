// ============================================================
// Shared types — mirror the Supabase schema.
// Import these in both the React app and the Trigger.dev jobs.
// ============================================================

export type ReportMode = 'briefing' | 'standard' | 'deep_dive';
export type Voice = 'neutral' | 'analytical' | 'conversational' | 'critical';
export type ReportStatus = 'pending' | 'generating' | 'complete' | 'failed';
export type PodcastStatus = 'pending' | 'generating' | 'complete' | 'failed';

// News recency window. Maps to Perplexity's search_recency_filter
// (day = 24h, week = 7d, month = 30d).
export type Recency = 'day' | 'week' | 'month';

// Level 2 subtopics, keyed by genre name
export type SubtopicMap = Record<string, string[]>;

// Per-genre recency overrides, keyed by genre name. Any genre not listed (and all
// custom interests) falls back to Preferences.default_recency.
export type RecencyOverrides = Record<string, Recency>;

export interface Preferences {
  id: string;
  user_id: string;
  genres: string[];               // Level 1
  subtopics: SubtopicMap;         // Level 2
  custom_interests: string[];     // Level 3 — natural language, max 5
  exclusions: string;
  report_mode: ReportMode;
  voice: Voice;
  max_topics: number;             // 1–10
  default_recency: Recency;       // default news window for the whole report
  recency_by_genre: RecencyOverrides; // optional per-genre overrides
  podcast_enabled: boolean;
  delivery_hour: number;          // 0–23, UTC
  updated_at: string;
}

// A cited source behind a report section. Title + date come from Perplexity's
// search_results so the report can show how recent each item is.
export interface ReportSource {
  title?: string;
  url: string;
  date?: string;                  // publication date as returned by Perplexity
}

// A single topic section within a report
export interface ReportSection {
  topic: string;                  // editorial heading for the section
  category: string | null;        // originating genre (null for custom interests / "For you")
  summary: string;
  sources: ReportSource[];        // sources with optional title + date
  level: 1 | 2 | 3;               // which topic level produced this section
  timeframe?: Recency;            // the recency window this section covers
}

export interface ReportContent {
  sections: ReportSection[];
}

export interface Report {
  id: string;
  user_id: string;
  date: string;                   // YYYY-MM-DD
  content: ReportContent | null;
  markdown: string | null;
  status: ReportStatus;
  error_message: string | null;
  created_at: string;
}

export interface PodcastEpisode {
  id: string;
  report_id: string;
  user_id: string;
  script: string | null;
  audio_url: string | null;       // storage path
  duration_seconds: number | null;
  status: PodcastStatus;
  created_at: string;
}
