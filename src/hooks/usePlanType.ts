import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type PlanType = "free" | "basic" | "enterprise";

const PLAN_LABELS: Record<PlanType, string> = {
  free: "Ingyenes",
  basic: "Alap",
  enterprise: "Professzionális",
};

export function usePlanType(user: User | null) {
  const [planType, setPlanType] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlanType("free");
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function check() {
      try {
        const { data: adminData } = await supabase.rpc("is_admin");
        if (cancelled) return;
        if (adminData === true) {
          setPlanType("enterprise");
          setLoading(false);
          return;
        }
        try {
          const { data: canInv } = await (supabase.rpc as any)("can_access_invoices", { _user_id: user.id });
          if (cancelled) return;
          if (canInv === true) {
            setPlanType("enterprise");
            setLoading(false);
            return;
          }
        } catch {}
        const { data: subData } = await (supabase.from("user_subscriptions" as any).select("plan_type").eq("user_id", user.id).single()) as { data: { plan_type: string } | null };
        if (cancelled) return;
        if (subData?.plan_type === "enterprise") setPlanType("enterprise");
        else if (subData?.plan_type === "basic") setPlanType("basic");
        else setPlanType("free");
      } catch { if (!cancelled) setPlanType("free"); }
      finally { if (!cancelled) setLoading(false); }
    }
    check();
    return () => { cancelled = true; };
  }, [user?.id]);
  return { planType, planLabel: PLAN_LABELS[planType], loading };
}
