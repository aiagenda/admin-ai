import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanKey =
  | "basic_doc"
  | "pro_doc"
  | "monthly"
  | "business"
  | "enterprise"
  // legacy
  | "alap"
  | "professzionalis";

const PAYMENT_MODE: PlanKey[] = ["basic_doc", "pro_doc"];

function resolvePriceId(plan: PlanKey): string {
  const map: Record<PlanKey, string | undefined> = {
    basic_doc: Deno.env.get("STRIPE_PRICE_BASIC_DOC") ?? undefined,
    pro_doc: Deno.env.get("STRIPE_PRICE_PRO_DOC") ?? undefined,
    monthly: Deno.env.get("STRIPE_PRICE_MONTHLY") ?? Deno.env.get("STRIPE_PRICE_ALAP") ?? undefined,
    business: Deno.env.get("STRIPE_PRICE_BUSINESS") ?? undefined,
    enterprise: Deno.env.get("STRIPE_PRICE_ENTERPRISE") ?? Deno.env.get("STRIPE_PRICE_PRO") ?? undefined,
    alap: Deno.env.get("STRIPE_PRICE_ALAP") ?? undefined,
    professzionalis: Deno.env.get("STRIPE_PRICE_PRO") ?? undefined,
  };
  const id = map[plan];
  if (id) return id;
  throw new Error("Stripe price is not configured for this plan. Set the matching STRIPE_PRICE_* in Supabase secrets.");
}

function resolveCheckoutPlan(plan: PlanKey): { canonical: string; isSubscription: boolean } {
  if (PAYMENT_MODE.includes(plan)) {
    return { canonical: plan, isSubscription: false };
  }
  if (plan === "alap") return { canonical: "monthly", isSubscription: true };
  if (plan === "professzionalis") return { canonical: "enterprise", isSubscription: true };
  if (plan === "monthly" || plan === "business" || plan === "enterprise") {
    return { canonical: plan, isSubscription: true };
  }
  throw new Error("Invalid plan");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json().catch(() => ({})) as { plan?: PlanKey };
    const plan = body.plan;
    const ALLOWED_PLANS: PlanKey[] = ["basic_doc", "pro_doc", "monthly", "business", "enterprise", "alap", "professzionalis"];
    if (!plan || !ALLOWED_PLANS.includes(plan)) {
      throw new Error("Invalid plan");
    }

    const { canonical, isSubscription } = resolveCheckoutPlan(plan);
    const priceId = resolvePriceId(plan === "alap" || plan === "professzionalis" ? plan : canonical as PlanKey);

    const appUrl = Deno.env.get("APP_URL") || "http://localhost:8080";

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId: string | undefined = profile?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;

    if (isSubscription) {
      const session = await stripe.checkout.sessions.create({
        customer: customerId!,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: `${appUrl}/pricing`,
        metadata: {
          user_id: user.id,
          plan: canonical,
        },
        subscription_data: {
          metadata: { user_id: user.id, plan: canonical },
        },
        allow_promotion_codes: true,
        locale: "hu",
        billing_address_collection: "required",
      });

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // One-time: doc credits
    const session = await stripe.checkout.sessions.create({
      customer: customerId!,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: successUrl,
      cancel_url: `${appUrl}/pricing`,
      metadata: { user_id: user.id, plan: canonical, purchase_kind: "one_time" },
      locale: "hu",
      billing_address_collection: "auto",
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("create-checkout-session:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
