import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleAuth() {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        console.error("Auth exchange error:", error.message);
        navigate("/auth?error=login_failed");
      } else {
        navigate("/");
      }
    }

    handleAuth();
  }, [navigate]);

  return <p>Bejelentkezés folyamatban...</p>;
}
