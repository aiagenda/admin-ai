#!/bin/bash

# Cron Job Creation Script
# This script creates a cron job on cron-job.org for the accountant report

CRON_JOB_API_KEY="b3VdxEbESQ5C2xUvwKAus8tNcIWfaa45L2AkGWQc4Uo="
SUPABASE_URL="https://kmtjturvfggqinamtarr.supabase.co"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/send-accountant-report"

echo "=========================================="
echo "AdminAI - Cron Job Setup"
echo "=========================================="
echo ""
echo "This script will create a cron job on cron-job.org"
echo "that runs every month on the 1st day at 9:00 AM (Budapest time)."
echo ""
echo "You need to provide your Supabase anon key."
echo "You can find it in: Supabase Dashboard > Project Settings > API > anon/public key"
echo ""
read -p "Enter your Supabase anon key: " SUPABASE_ANON_KEY

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "ERROR: Supabase anon key is required!"
  exit 1
fi

echo ""
echo "Creating cron job..."
echo ""

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

# Check if response contains job ID (success)
if echo "$RESPONSE" | grep -q "jobId"; then
  JOB_ID=$(echo "$RESPONSE" | grep -o '"jobId":[0-9]*' | grep -o '[0-9]*')
  echo "✅ Cron job created successfully!"
  echo ""
  echo "Job ID: $JOB_ID"
  echo "Manage your cron job at: https://cron-job.org/en/members/jobs/"
  echo ""
  echo "The cron job will run every month on the 1st day at 9:00 AM (Europe/Budapest)."
else
  echo "❌ Error creating cron job:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  echo ""
  echo "Please check:"
  echo "1. Your cron-job.org API key is correct"
  echo "2. Your Supabase anon key is correct"
  echo "3. You can also set it up manually at: https://cron-job.org/en/members/jobs/"
fi
