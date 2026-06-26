// Single-select segmented control — report mode, recency window.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition-colors ${
            value === o.value ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--muted)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
