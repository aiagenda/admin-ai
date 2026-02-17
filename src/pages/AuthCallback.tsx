import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleAuth() {
      const hasHash = window.location.hash?.includes("access_token");
      const hasCode = new URLSearchParams(window.location.search).get("code");

      if (hasHash) {
        // Implicit flow: give Supabase a moment to parse the hash and set the session
        await new Promise((r) => setTimeout(r, 100));
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/", { replace: true });
        } else {
          navigate("/auth?error=login_failed", { replace: true });
        }
        return;
      }

      if (hasCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          console.error("Auth exchange error:", error.message);
          navigate("/auth?error=login_failed", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
        return;
      }

      navigate("/auth?error=login_failed", { replace: true });
    }

    handleAuth();
  }, [navigate]);

  return <p>Bejelentkezés folyamatban...</p>;
}
