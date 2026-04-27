import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function buildPriceToSubscriptionPlan(): Record<string, { plan_type: string; documents_per_month: number }> {
  const out: Record<string, { plan_type: string; documents_per_month: number }> = {};
  const p = (k: string) => {
    const v = Deno.env.get(k);
    if (v) return v;
    return null;
  };
  const m = p("STRIPE_PRICE_MONTHLY") ?? p("STRIPE_PRICE_ALAP");
  if (m) out[m] = { plan_type: "monthly", documents_per_month: 10 };
  const b = p("STRIPE_PRICE_BUSINESS");
  if (b) out[b] = { plan_type: "business", documents_per_month: 50 };
  const e = p("STRIPE_PRICE_ENTERPRISE") ?? p("STRIPE_PRICE_PRO");
  if (e) out[e] = { plan_type: "enterprise", documents_per_month: 9999 };
  const a = p("STRIPE_PRICE_ALAP");
  if (a) out[a] = { plan_type: "monthly", documents_per_month: 10 };
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error("Stripe configuration missing");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature");
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Invalid signature", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const subPlanByPrice = buildPriceToSubscriptionPlan();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        if (!userId) break;

        if (session.mode === "payment" && (plan === "basic_doc" || plan === "pro_doc")) {
          const { data: row } = await supabase
            .from("user_subscriptions")
            .select("prepaid_basic_credits, prepaid_pro_credits")
            .eq("user_id", userId)
            .maybeSingle();

          const nextBasic = (row?.prepaid_basic_credits ?? 0) + (plan === "basic_doc" ? 1 : 0);
          const nextPro = (row?.prepaid_pro_credits ?? 0) + (plan === "pro_doc" ? 1 : 0);
          const cust = (session.customer as string) || null;

          if (row) {
            const u: Record<string, unknown> = {
              prepaid_basic_credits: nextBasic,
              prepaid_pro_credits: nextPro,
              updated_at: new Date().toISOString(),
            };
            if (cust) u.stripe_customer_id = cust;
            await supabase.from("user_subscriptions").update(u).eq("user_id", userId);
          } else {
            await supabase.from("user_subscriptions").insert({
              user_id: userId,
              plan_type: "free",
              documents_per_month: 0,
              free_trial_docs_used: 0,
              prepaid_basic_credits: nextBasic,
              prepaid_pro_credits: nextPro,
              stripe_customer_id: cust,
            });
          }
          console.log("one-time doc credits:", userId, plan);
        }

        if (session.mode === "subscription" && plan) {
          const p = plan;
          const dpm = p === "monthly" ? 10 : p === "business" ? 50 : 9999;
          const type = p === "monthly" || p === "business" || p === "enterprise" ? p : "monthly";
          await supabase.from("user_subscriptions").upsert(
            {
              user_id: userId,
              plan_type: type,
              documents_per_month: dpm,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
          console.log(`Subscription activated: ${userId} ${type}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (!userId) break;
        const priceId = subscription.items.data[0]?.price?.id;
        const map = (priceId && subPlanByPrice[priceId]) || { plan_type: "monthly", documents_per_month: 10 };
        await supabase
          .from("user_subscriptions")
          .update({
            plan_type: map.plan_type,
            documents_per_month: map.documents_per_month,
            subscription_status: subscription.status === "active" ? "active" : subscription.status,
            updated_at: new Date().toISOString(),
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
          })
          .eq("user_id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.user_id;
        if (!userId) {
          const { data: sub } = await supabase
            .from("user_subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", subscription.customer as string)
            .maybeSingle();
          userId = sub?.user_id as string | undefined;
        }
        if (userId) {
          await supabase
            .from("user_subscriptions")
            .update({
              plan_type: "free",
              documents_per_month: 0,
              subscription_status: "cancelled",
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (profile) {
          await supabase
            .from("user_subscriptions")
            .update({ subscription_status: "past_due" })
            .eq("user_id", profile.user_id);
        }
        break;
      }

      default: {
        console.log(`unhandled: ${event.type}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("stripe-webhook", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
