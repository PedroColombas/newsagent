// Temporary stand-in for screens built in later phases (4-6).
export function PagePlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <section className="px-5 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{note}</p>
    </section>
  );
}
