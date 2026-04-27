import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type PlanType = "free" | "basic" | "pro" | "monthly" | "business" | "enterprise";

const PLAN_LABELS: Record<PlanType, string> = {
  free: "Ingyenes",
  basic: "Alap (régi)",
  pro: "Pro (régi)",
  monthly: "Havi 10",
  business: "Business 50",
  enterprise: "Professzionális",
};

const ALLOWED = new Set<string>(["free", "basic", "pro", "monthly", "business", "enterprise"]);

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: canInv } = await (supabase as any).rpc("can_access_invoices", { _user_id: user.id });
          if (cancelled) return;
          if (canInv === true) {
            setPlanType("enterprise");
            setLoading(false);
            return;
          }
        } catch {
          /* optional RPC */
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: subData } = (await (supabase as any)
          .from("user_subscriptions")
          .select("plan_type")
          .eq("user_id", user.id)
          .single()) as { data: { plan_type: string } | null };
        if (cancelled) return;
        const t = subData?.plan_type ?? "free";
        if (ALLOWED.has(t)) setPlanType(t as PlanType);
        else setPlanType("free");
      } catch {
        if (!cancelled) setPlanType("free");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);
  return { planType, planLabel: PLAN_LABELS[planType] ?? planType, loading };
}
