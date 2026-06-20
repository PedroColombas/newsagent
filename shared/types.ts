// ============================================================
// Shared types — mirror the Supabase schema.
// Import these in both the React app and the Trigger.dev jobs.
// ============================================================

export type ReportMode = 'briefing' | 'standard' | 'deep_dive';
export type Voice = 'neutral' | 'analytical' | 'conversational' | 'critical';
export type ReportStatus = 'pending' | 'generating' | 'complete' | 'failed';
export type PodcastStatus = 'pending' | 'generating' | 'complete' | 'failed';

// Level 2 subtopics, keyed by genre name
export type SubtopicMap = Record<string, string[]>;

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
  podcast_enabled: boolean;
  delivery_hour: number;          // 0–23, UTC
  updated_at: string;
}

// A single topic section within a report
export interface ReportSection {
  topic: string;
  summary: string;
  sources: string[];              // URLs / publication names from Perplexity
  level: 1 | 2 | 3;               // which topic level produced this section
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
