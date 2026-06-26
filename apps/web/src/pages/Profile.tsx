import { useAuth } from "../auth/AuthProvider";

export function Profile() {
  const { user, signOut } = useAuth();
  const email = user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <section className="px-5 py-7">
      <h1 className="px-1 text-[28px] font-bold tracking-tight">Profile</h1>

      {/* Account header */}
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
        <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-[var(--accent)]/12 text-[19px] font-bold text-[var(--accent)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{email || "Signed in"}</span>
          <span className="text-[13px] text-[var(--faint)]">Daily Brief account</span>
        </div>
      </div>

      <button
        onClick={() => void signOut()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-3.5 text-[15px] font-semibold text-[var(--accent)]"
      >
        Sign out
      </button>

      <p className="mt-6 px-1 text-[12.5px] leading-relaxed text-[var(--faint)]">
        Delivery time, notifications, and appearance settings will live here.
      </p>
    </section>
  );
}
