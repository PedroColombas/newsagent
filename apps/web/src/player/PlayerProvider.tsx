import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";

export interface PlayerEpisode {
  episodeId: string;
  reportId: string;
  date: string; // YYYY-MM-DD — for the player cover/label
  audioPath: string; // storage path in the podcast-audio bucket
  durationSeconds: number | null;
}

interface PlayerContextValue {
  episode: PlayerEpisode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  loading: boolean;
  play: (ep: PlayerEpisode) => Promise<void>;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (delta: number) => void;
  setRate: (r: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

// One audio element for the whole app, mounted above the routes so playback survives
// navigation. Private-bucket audio is played via a short-lived signed URL.
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [episode, setEpisode] = useState<PlayerEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [loading, setLoading] = useState(false);

  async function play(ep: PlayerEpisode) {
    const audio = audioRef.current;
    if (!audio) return;

    // Same episode → just resume.
    if (episode?.episodeId === ep.episodeId) {
      void audio.play().catch(() => {});
      return;
    }

    setLoading(true);
    const { data } = await supabase.storage
      .from("podcast-audio")
      .createSignedUrl(ep.audioPath, 3600);
    setLoading(false);
    if (!data?.signedUrl) return;

    setEpisode(ep);
    setCurrentTime(0);
    setDuration(ep.durationSeconds ?? 0);
    audio.src = data.signedUrl;
    audio.playbackRate = rate;
    void audio.play().catch(() => {});
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio || !episode) return;
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  }

  function seek(t: number) {
    if (audioRef.current) audioRef.current.currentTime = t;
  }

  function skip(delta: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const max = audio.duration || 0;
    audio.currentTime = Math.max(0, Math.min(max, audio.currentTime + delta));
  }

  function setRate(r: number) {
    setRateState(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }

  const value: PlayerContextValue = {
    episode,
    isPlaying,
    currentTime,
    duration,
    rate,
    loading,
    play,
    toggle,
    seek,
    skip,
    setRate,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        hidden
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
