import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import type { Report } from "@shared/types";
import { useAuth } from "../auth/AuthProvider";
import { useLatestReport } from "../hooks/useLatestReport";
import {
  formatReportDate,
  greeting,
  displayName,
  estimateReadMinutes,
  snippet,
} from "../lib/report-format";

export function Today() {
  const { user } = useAuth();
  const { report, episode, loading } = useLatestReport();
  const navigate = useNavigate();

  if (loading) {
    return <Centered>Loading your brief…</Centered>;
  }

  if (!report) {
    return (
      <Centered>
        <h1 className="text-[22px] font-bold tracking-tight">No briefs yet</h1>
        <p className="mt-2 max-w-[260px] text-[14px] leading-relaxed text-[var(--muted)]">
          Your first daily brief will appear here once it's been compiled. Set your topics in
          Preferences to shape it.
        </p>
      </Centered>
    );
  }

  if (report.status !== "complete" || !report.content) {
    return <StatusState report={report} />;
  }

  const sections = report.content.sections;
  const name = displayName(user);
  const minutes = estimateReadMinutes(sections.map((s) => s.summary));

  return (
    <section className="px-6 pb-12 pt-6">
      <span className="text-[12px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
        {formatReportDate(report.date)}
      </span>
      <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight">
        {greeting()}
        {name ? `, ${name}` : ""}
      </h1>
      <span className="mt-2 block text-[13.5px] text-[var(--muted)]">
        Your brief · {sections.length} {sections.length === 1 ? "topic" : "topics"} · {minutes} min
        read{episode ? " · Podcast" : ""}
      </span>

      <div className="mt-3 flex flex-col">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => navigate(`/report/${report.date}#s${i}`)}
            className="flex flex-col gap-2 border-t border-[var(--line)] py-5 text-left transition-opacity active:opacity-60"
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--accent)]" />
              <span className="text-[11.5px] font-semibold uppercase tracking-[1.4px] text-[var(--muted)]">
                {s.category ?? "For you"}
              </span>
            </div>
            <h2 className="text-[20px] font-semibold leading-snug tracking-tight">{s.topic}</h2>
            <p className="text-[15px] leading-relaxed text-[var(--ink)]/85">{snippet(s.summary)}</p>
            {s.sources.length > 0 && (
              <span className="text-[12.5px] text-[var(--faint)]">
                {s.sources.length} {s.sources.length === 1 ? "source" : "sources"}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

function StatusState({ report }: { report: Report }) {
  const compiling = report.status === "pending" || report.status === "generating";
  return (
    <Centered>
      <span className="text-[12px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
        {formatReportDate(report.date)}
      </span>
      <h1 className="mt-2 text-[22px] font-bold tracking-tight">
        {compiling ? "Compiling your brief…" : "Today's brief didn't generate"}
      </h1>
      <p className="mt-2 max-w-[270px] text-[14px] leading-relaxed text-[var(--muted)]">
        {compiling
          ? "Your report is being put together — check back in a few minutes."
          : "Something went wrong generating this report. It'll retry on the next run."}
      </p>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">{children}</div>
  );
}
