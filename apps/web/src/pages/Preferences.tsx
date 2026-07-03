import type { ReactNode } from "react";
import { usePreferences } from "../hooks/usePreferences";
import { ReportStyleControls } from "../components/preferences/ReportStyleControls";
import { DeliveryTimeSelect } from "../components/preferences/DeliveryTimeSelect";
import { TopicManager } from "../components/preferences/TopicManager";
import { Toggle } from "../components/ui/Toggle";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[1.1px] text-[var(--faint)]">
      {children}
    </span>
  );
}

export function Preferences() {
  const { prefs, loading, status, update } = usePreferences();

  if (loading || !prefs) {
    return <div className="px-6 py-10 text-[14px] text-[var(--faint)]">Loading your preferences…</div>;
  }

  const statusLabel =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Couldn't save"
          : "";

  return (
    <section className="flex flex-col gap-7 px-5 pb-10 pt-7">
      <div className="flex items-baseline justify-between px-1">
        <h1 className="text-[28px] font-bold tracking-tight">Preferences</h1>
        {statusLabel && (
          <span
            className={`text-[12.5px] font-medium ${
              status === "error" ? "text-red-600 dark:text-red-400" : "text-[var(--faint)]"
            }`}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Your topics — each is a section; drag to reorder, tap to edit, or add */}
      <div className="flex flex-col gap-3">
        <div className="px-1">
          <SectionLabel>Your topics</SectionLabel>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            Each is a section in your brief. Drag to reorder, tap to edit, or add your own.
          </p>
        </div>
        <TopicManager prefs={prefs} update={update} />
      </div>

      {/* Report style */}
      <div className="flex flex-col gap-5">
        <SectionLabel>Report style</SectionLabel>
        <ReportStyleControls prefs={prefs} update={update} />
      </div>

      {/* Delivery time */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">Delivery time</span>
          <span className="text-[12px] text-[var(--muted)]">When your brief lands each day, in your local time</span>
        </div>
        <DeliveryTimeSelect
          valueUtc={prefs.delivery_hour}
          onChange={(delivery_hour) => update({ delivery_hour })}
        />
      </div>

      {/* Daily podcast */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">Daily podcast</span>
          <span className="text-[12px] text-[var(--muted)]">A conversational audio version of your report</span>
        </div>
        <Toggle checked={prefs.podcast_enabled} onChange={(podcast_enabled) => update({ podcast_enabled })} />
      </div>
    </section>
  );
}
