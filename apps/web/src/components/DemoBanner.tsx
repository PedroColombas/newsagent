// Persistent notice for the public demo. A visitor has to know at a glance that the briefs are
// pre-made and that nothing will generate — otherwise an action that politely declines reads as a
// broken app, which is the impression this whole thing exists to avoid.
export function DemoBanner() {
  return (
    <div data-demo-banner className="flex-none border-b border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-center">
      <span className="text-[12px] font-medium text-[var(--accent)]">
        Demo · sample briefs, generating new ones is switched off
      </span>
    </div>
  );
}
