import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { isUsMarket } from "@/lib/market";

const t = isUsMarket()
  ? { checking: "Checking access…", denied: "Access denied", deniedDesc: "This page requires administrator permissions.", backHome: "Back to home" }
  : { checking: "Ellenőrzés…",      denied: "Hozzáférés megtagadva", deniedDesc: "Ehhez az oldalhoz adminisztrátori jogosultság szükséges.", backHome: "Vissza a kezdőlapra" };

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc("is_admin");
        if (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    checkAdminRole();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">{t.checking}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold mb-4">{t.denied}</h1>
          <p className="text-muted-foreground mb-6">{t.deniedDesc}</p>
          <a href="/" className="text-primary hover:underline">
            {t.backHome}
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
