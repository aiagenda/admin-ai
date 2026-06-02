import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface UsageData {
  can_upload: boolean;
  current_usage: number;
  limit_amount: number;
  plan_type: string;
  prepaid_basic_credits?: number;
  prepaid_pro_credits?: number;
}

export function UsageLimit() {
  const { t } = useTranslation("common");
  const u = "usageLimit";
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
      } catch (error: unknown) {
        const e = error as { code?: string; message?: string; status?: number };
        if (e?.code === "PGRST202" || e?.message?.includes("Could not find the function") || e?.status === 404) {
          sessionStorage.setItem(STORAGE_KEY, "false");
          setLoading(false);
          return;
        }
        console.error("Error fetching usage:", error);
        toast.error(t(`${u}.loadError`));
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [user]);

  if (loading) {
    return null;
  }

  if (!usage) {
    return null;
  }

  const pb = usage.prepaid_basic_credits ?? 0;
  const pp = usage.prepaid_pro_credits ?? 0;
  const hasPrepaid = pb > 0 || pp > 0;
  const limit = Math.max(usage.limit_amount, 1);
  const percentage = (usage.current_usage / limit) * 100;
  const remaining = Math.max(0, limit - usage.current_usage);
  const isNearLimit = !hasPrepaid && percentage >= 80;
  const isAtLimit = !usage.can_upload;

  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case "pro": return t(`${u}.planProLegacy`);
      case "enterprise": return t(`${u}.planEnterprise`);
      case "monthly":
      case "basic": return t(`${u}.planMonthly`);
      case "business": return t(`${u}.planBusiness`);
      default: return t(`${u}.planFree`);
    }
  };

  return (
    <Card className={isAtLimit ? "border-destructive" : isNearLimit ? "border-warning" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {usage.plan_type === "free" && !hasPrepaid ? (
              <Crown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            )}
            {t(`${u}.quotaTitle`, { plan: getPlanLabel(usage.plan_type) })}
          </CardTitle>
          {isAtLimit && <AlertTriangle className="h-4 w-4 text-destructive" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasPrepaid && (
          <p className="text-sm text-muted-foreground">
            {t(`${u}.prepaid`, { basic: pb, pro: pp }).split(":")[0] + ":"} <span className="font-medium text-foreground">{pb}</span> alap ·{" "}
            <span className="font-medium text-foreground">{pp}</span> pro elemzés
          </p>
        )}

        {usage.plan_type === "free" && !hasPrepaid && (
          <p className="text-sm text-muted-foreground">
            {t(`${u}.freeTrial`)}
          </p>
        )}

        {usage.plan_type !== "free" && !hasPrepaid && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t(`${u}.monthlyUsage`, { used: usage.current_usage, limit: usage.limit_amount })}
              </span>
              <span
                className={
                  isAtLimit ? "text-destructive font-semibold" : isNearLimit ? "text-warning font-semibold" : "text-muted-foreground"
                }
              >
                {t(`${u}.remaining`, { count: isAtLimit ? 0 : remaining })}
              </span>
            </div>
            <Progress value={Math.min(100, percentage)} className={isAtLimit ? "bg-destructive" : isNearLimit ? "bg-warning" : ""} />
          </div>
        )}

        {isAtLimit && (
          <div className="pt-2 border-t">
            <p className="text-sm text-destructive mb-3">{t(`${u}.atLimit`)}</p>
            <Button size="sm" onClick={() => navigate("/pricing")} className="w-full">
              Árak
            </Button>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="pt-2 border-t">
            <p className="text-sm text-warning mb-3">{t(`${u}.nearLimit`)}</p>
            <Button size="sm" variant="outline" onClick={() => navigate("/pricing")} className="w-full">
              Csomagok
            </Button>
          </div>
        )}

        {usage.plan_type === "free" && usage.can_upload && !hasPrepaid && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">{t(`${u}.freeHint`)}</p>
            <Button size="sm" variant="outline" onClick={() => navigate("/pricing")} className="w-full">
              Árak
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
