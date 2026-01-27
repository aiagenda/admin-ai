#!/bin/bash

# Cron Job Setup Script for Accountant Report
# This script helps set up the cron job on cron-job.org

CRON_JOB_API_KEY="b3VdxEbESQ5C2xUvwKAus8tNcIWfaa45L2AkGWQc4Uo="
SUPABASE_URL="https://kmtjturvfggqinamtarr.supabase.co"
SUPABASE_ANON_KEY="" # Will be fetched or needs to be set manually

echo "Setting up cron job for accountant reports..."
echo ""
echo "Please provide your Supabase anon key (or press Enter to use the API to fetch it):"
read -r SUPABASE_ANON_KEY_INPUT

if [ -z "$SUPABASE_ANON_KEY_INPUT" ]; then
  echo "Fetching anon key from Supabase project..."
  # Try to get from Supabase CLI
  SUPABASE_ANON_KEY=$(supabase status 2>/dev/null | grep "anon key" | awk '{print $3}' || echo "")
fi

if [ -z "$SUPABASE_ANON_KEY" ] && [ -n "$SUPABASE_ANON_KEY_INPUT" ]; then
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY_INPUT"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "ERROR: Supabase anon key is required!"
  echo "You can find it in: Supabase Dashboard > Project Settings > API"
  exit 1
fi

FUNCTION_URL="${SUPABASE_URL}/functions/v1/send-accountant-report"

echo ""
echo "Creating cron job on cron-job.org..."
echo "URL: $FUNCTION_URL"
echo ""

# Create cron job using cron-job.org API
RESPONSE=$(curl -s -X POST "https://api.cron-job.org/jobs" \
  -H "Authorization: Bearer $CRON_JOB_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"job\": {
      \"enabled\": true,
      \"title\": \"AdminAI - Monthly Accountant Report\",
      \"url\": \"$FUNCTION_URL\",
      \"schedule\": {
        \"timezone\": \"Europe/Budapest\",
        \"hours\": [9],
        \"mdays\": [1],
        \"months\": [-1],
        \"wdays\": [-1],
        \"minutes\": [0]
      },
      \"requestMethod\": 1,
      \"extendedData\": {
        \"body\": \"{}\",
        \"headers\": [
          {
            \"name\": \"Authorization\",
            \"value\": \"Bearer $SUPABASE_ANON_KEY\"
          },
          {
            \"name\": \"Content-Type\",
            \"value\": \"application/json\"
          }
        ]
      }
    }
  }")

echo "Response from cron-job.org:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Cron job setup complete!"
echo ""
echo "The cron job will run every month on the 1st day at 9:00 AM (Europe/Budapest timezone)."
echo "You can manage it at: https://cron-job.org/en/members/jobs/"
