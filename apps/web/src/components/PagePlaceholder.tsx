// Temporary stand-in for screens built in later passes (Today / Report / History / Podcast).
export function PagePlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <section className="px-6 py-7">
      <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">{note}</p>
    </section>
  );
}
