import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map Stripe price IDs to subscription plans
const PLAN_MAPPING: Record<string, string> = {
  [Deno.env.get("STRIPE_PRICE_ALAP") || "price_alap"]: "basic",
  [Deno.env.get("STRIPE_PRICE_PRO") || "price_pro"]: "enterprise",
};

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

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature");
    }

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        
        if (userId && plan) {
          const subscriptionPlan = plan === "professzionalis" ? "enterprise" : "basic";
          
          // Update user subscription
          await supabase
            .from("user_subscriptions")
            .upsert({
              user_id: userId,
              plan: subscriptionPlan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }, {
              onConflict: "user_id"
            });

          console.log(`✅ Subscription activated for user ${userId}: ${subscriptionPlan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        
        if (userId) {
          const priceId = subscription.items.data[0]?.price.id;
          const plan = PLAN_MAPPING[priceId] || "basic";
          
          await supabase
            .from("user_subscriptions")
            .update({
              status: subscription.status === "active" ? "active" : "inactive",
              plan: plan,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("user_id", userId);

          console.log(`✅ Subscription updated for user ${userId}: ${subscription.status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        
        if (userId) {
          // Downgrade to free plan
          await supabase
            .from("user_subscriptions")
            .update({
              plan: "free",
              status: "cancelled",
              stripe_subscription_id: null,
            })
            .eq("user_id", userId);

          console.log(`✅ Subscription cancelled for user ${userId}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          // Update subscription period
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.user_id;
          
          if (userId) {
            await supabase
              .from("user_subscriptions")
              .update({
                status: "active",
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq("user_id", userId);

            // Reset monthly usage
            await supabase
              .from("user_usage_stats")
              .update({
                documents_this_month: 0,
                last_reset_date: new Date().toISOString(),
              })
              .eq("user_id", userId);

            console.log(`✅ Payment succeeded, usage reset for user ${userId}`);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Find user by customer ID
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "past_due",
            })
            .eq("user_id", profile.user_id);

          console.log(`⚠️ Payment failed for user ${profile.user_id}`);
          
          // TODO: Send email notification about failed payment
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
