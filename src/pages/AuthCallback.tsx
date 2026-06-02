import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageSEO } from "@/components/PageSEO";
import { useTranslation } from "react-i18next";
import posthog from "posthog-js";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  useEffect(() => {
    async function handleAuth() {
      const hasHash = window.location.hash?.includes("access_token");
      const hasCode = new URLSearchParams(window.location.search).get("code");

      if (hasHash) {
        await new Promise((r) => setTimeout(r, 100));
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          if (session.user) {
            posthog.identify(session.user.id, { email: session.user.email });
            posthog.capture("user signed in", { method: "google" });
          }
          navigate("/", { replace: true });
        } else {
          navigate("/auth?error=login_failed", { replace: true });
        }
        return;
      }

      if (hasCode) {
        const { error, data } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          posthog.captureException(error);
          console.error("Auth exchange error:", error.message);
          navigate("/auth?error=login_failed", { replace: true });
        } else {
          if (data.session?.user) {
            posthog.identify(data.session.user.id, { email: data.session.user.email });
            posthog.capture("user signed in", { method: "google" });
          }
          navigate("/", { replace: true });
        }
        return;
      }

      navigate("/auth?error=login_failed", { replace: true });
    }

    handleAuth();
  }, [navigate]);

  return (
    <>
      <PageSEO pageKey="authCallback" path="/auth/callback" noindex />
      <p className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("authPage.checkingAccess")}
      </p>
    </>
  );
}
