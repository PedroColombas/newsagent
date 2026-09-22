import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { appUrl } from "../lib/routes";

// Public demo account. These are deliberately public — they ship in the browser bundle so a visitor
// can look around without signing up. The account is read-only in practice: every paid action is
// blocked for it server-side. The demo sign-in only appears when both values are configured.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL as string | undefined;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD as string | undefined;
export const demoAvailable = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInAsDemo: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithEmail(email: string): Promise<{ error: string | null }> {
    // Magic link — no password. Supabase emails a sign-in link back to the app.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: appUrl() },
    });
    return { error: error ? error.message : null };
  }

  async function signInWithGoogle(): Promise<{ error: string | null }> {
    // OAuth redirect flow. Requires the Google provider to be enabled in Supabase Auth
    // (with a Google Cloud OAuth client). Apple sign-in is deferred to the App Store build.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: appUrl() },
    });
    return { error: error ? error.message : null };
  }

  async function signInAsDemo(): Promise<{ error: string | null }> {
    // Password sign-in, not a magic link: a visitor must get in with one tap and no email.
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return { error: "Demo is not configured" };
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    return { error: error ? error.message : null };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signInAsDemo,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
