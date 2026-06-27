import { useParams, useNavigate } from "react-router-dom";

// Stub — the full reading view (continuous scroll, per-section sources, reading actions)
// is built next.
export function Report() {
  const { date } = useParams();
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-6 py-6">
      <button
        onClick={() => navigate(-1)}
        className="self-start text-[14px] font-semibold text-[var(--accent)]"
      >
        ← Back
      </button>
      <div className="flex flex-1 items-center justify-center text-center">
        <p className="text-[14px] text-[var(--muted)]">
          Reading view for {date} — coming next.
        </p>
      </div>
    </div>
  );
}
