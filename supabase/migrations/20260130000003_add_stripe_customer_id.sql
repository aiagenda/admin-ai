-- Add Stripe customer ID to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id 
ON public.user_profiles(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Add Stripe subscription ID to user_subscriptions
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id 
ON public.user_subscriptions(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id 
ON public.user_subscriptions(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;
