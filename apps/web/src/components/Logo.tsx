// The "Daily" wordmark — a sunrise arc over the "ai".
//
// Every dimension inside is in `em`, so the whole mark scales from the single `size` prop. It is
// real text, so a screen reader reads "Daily" and the arc is hidden from them.
//
// From the logo spec:
//  • The arc is the only mark. Never pair it with an icon tile.
//  • Arc and "ai" always share one colour. The app's dark palette already defines --ink and
//    --accent as the spec's dark values (#f3efe7 / #e2794d), so the tokens carry both themes.
//  • At 14px and below the arc thickens, or it disappears.
//  • Leave at least 0.5em clear above — the arc overshoots the cap height.
export function Logo({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.022em",
        color: "var(--ink)",
        whiteSpace: "nowrap",
      }}
    >
      D
      <span style={{ position: "relative", color: "var(--accent)" }}>
        ai
        <svg
          viewBox="0 0 26 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={size <= 14 ? 2.6 : 2.4}
          strokeLinecap="round"
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: "-0.41em",
            width: "1.05em",
            height: "0.5em",
          }}
        >
          <path d="M2 10.5 a14 14 0 0 1 22 0" />
        </svg>
      </span>
      ly
    </span>
  );
}
