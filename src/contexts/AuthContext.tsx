import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import posthog from "posthog-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        posthog.identify(session.user.id, { email: session.user.email });
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (signedInUser) {
        posthog.identify(signedInUser.id, { email: signedInUser.email });
        posthog.capture("user signed in", { method: "email" });
      }
      toast.success(t("authPage.signIn") + " ✓");
      navigate("/");
      return { error: null };
    } catch (error) {
      posthog.captureException(error);
      toast.error((error as Error)?.message || t("authPage.toastSignInFailed"));
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectOrigin = import.meta.env.VITE_APP_ORIGIN || window.location.origin;
      const redirectUrl = `${redirectOrigin}/auth/callback`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      posthog.capture("user signed up", { method: "email" });
      toast.success(t("authPage.signUp") + " — check your email");
      return { error: null };
    } catch (error) {
      posthog.captureException(error);
      toast.error((error as Error)?.message || t("authPage.toastSignUpFailed"));
      return { error };
    }
  };

  const signOut = async () => {
    try {
      posthog.capture("user signed out");
      await supabase.auth.signOut();
      posthog.reset();
      toast.success(t("authPage.signOutSuccess", { defaultValue: "Signed out" }));
      navigate("/");
    } catch {
      toast.error(t("authPage.toastAuthError"));
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, loading }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
