import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UsageData {
  can_upload: boolean;
  current_usage: number;
  limit_amount: number;
  plan_type: string;
}

export function UsageLimit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (import.meta.env.VITE_USAGE_LIMIT_ENABLED !== "true") {
      setLoading(false);
      return;
    }

    const STORAGE_KEY = "usage_limit_rpc_available";
    if (sessionStorage.getItem(STORAGE_KEY) === "false") {
      setLoading(false);
      return;
    }

    const fetchUsage = async () => {
      try {
        const { data, error } = await supabase.rpc("can_user_upload", {
          _user_id: user.id,
        });

        if (error) {
          // If function doesn't exist (migration not run), silently fail
          if (error.code === "PGRST202" || error.message?.includes("Could not find the function")) {
            sessionStorage.setItem(STORAGE_KEY, "false");
            setLoading(false);
            return;
          }
          throw error;
        }

        if (data && data.length > 0) {
          setUsage(data[0] as UsageData);
        }
      } catch (error: any) {
        if (error?.code === "PGRST202" || error?.message?.includes("Could not find the function") || error?.status === 404) {
          sessionStorage.setItem(STORAGE_KEY, "false");
          setLoading(false);
          return;
        }
        console.error("Error fetching usage:", error);
        toast.error("Hiba a használati adatok betöltése során");
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [user]);

  if (loading) {
    return null;
  }

  // Don't show component if usage data is not available (migration not run)
  if (!usage) {
    return null;
  }

  const percentage = (usage.current_usage / usage.limit_amount) * 100;
  const remaining = usage.limit_amount - usage.current_usage;
  const isNearLimit = percentage >= 80;
  const isAtLimit = !usage.can_upload;

  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case "pro":
        return "Pro";
      case "enterprise":
        return "Enterprise";
      default:
        return "Ingyenes";
    }
  };

  return (
    <Card className={isAtLimit ? "border-destructive" : isNearLimit ? "border-warning" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {usage.plan_type === "free" ? (
              <Crown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            )}
            Használati kvóta ({getPlanLabel(usage.plan_type)})
          </CardTitle>
          {isAtLimit && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {usage.current_usage} / {usage.limit_amount} dokumentum ebben a hónapban
            </span>
            <span className={isAtLimit ? "text-destructive font-semibold" : isNearLimit ? "text-warning font-semibold" : "text-muted-foreground"}>
              {remaining} maradt
            </span>
          </div>
          <Progress 
            value={percentage} 
            className={isAtLimit ? "bg-destructive" : isNearLimit ? "bg-warning" : ""}
          />
        </div>

        {isAtLimit && (
          <div className="pt-2 border-t">
            <p className="text-sm text-destructive mb-3">
              Elérte a havi kvóta limitjét. Frissítse előfizetését további dokumentumok feltöltéséhez.
            </p>
            <Button
              size="sm"
              onClick={() => navigate("/pricing")}
              className="w-full"
            >
              Előfizetés frissítése
            </Button>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="pt-2 border-t">
            <p className="text-sm text-warning mb-3">
              Közel van a havi kvóta limitjéhez. Fontolja meg az előfizetés frissítését.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/pricing")}
              className="w-full"
            >
              Előfizetés megtekintése
            </Button>
          </div>
        )}

        {usage.plan_type === "free" && !isNearLimit && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Frissítsen Pro-ra korlátlan dokumentumokért
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/pricing")}
              className="w-full"
            >
              Pro előfizetés
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

