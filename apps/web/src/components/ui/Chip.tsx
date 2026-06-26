// Selectable pill — genres, subtopics, voices. Selected = filled ink; unselected = outline.
export function Chip({
  label,
  selected = false,
  onClick,
  size = "md",
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-3 py-1.5 text-[12.5px]" : "px-3.5 py-2 text-[13.5px]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors ${pad} ${
        selected
          ? "bg-[var(--ink)] text-[var(--paper)]"
          : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
      }`}
    >
      {label}
      {selected ? <span className="opacity-70">✓</span> : null}
    </button>
  );
}
