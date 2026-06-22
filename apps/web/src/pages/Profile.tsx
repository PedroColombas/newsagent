import { useAuth } from "../auth/AuthProvider";

export function Profile() {
  const { user, signOut } = useAuth();

  return (
    <section className="px-5 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Profile</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Signed in as <strong>{user?.email}</strong>
      </p>
      <button
        onClick={() => void signOut()}
        className="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
      >
        Sign out
      </button>
    </section>
  );
}
