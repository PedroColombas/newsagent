// iOS-style switch.
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[27px] w-[46px] flex-none rounded-full transition-colors ${
        checked ? "bg-[var(--accent)]" : "bg-[var(--line)]"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[23px] w-[23px] rounded-full bg-white shadow transition-all ${
          checked ? "left-[21px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}
