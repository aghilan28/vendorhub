#!/bin/bash
set -e
echo "VendorHub Staging Environment Setup"
echo "====================================="

echo "1. Checking required env vars..."
REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  RAZORPAY_KEY_ID
  RAZORPAY_KEY_SECRET
  RAZORPAY_WEBHOOK_SECRET
  NEXT_PUBLIC_RAZORPAY_KEY_ID
  CRON_SECRET
  NEXT_PUBLIC_VAPID_PUBLIC_KEY
  VAPID_PRIVATE_KEY
  VAPID_SUBJECT
  DATABASE_URL
)
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "MISSING: $var"
    exit 1
  else
    echo "OK: $var"
  fi
done

echo "2. Running migrations..."
npx supabase db push --db-url "$DATABASE_URL"

echo "3. Verifying RLS policies..."
npx supabase db lint

echo "4. Running unit tests..."
npm run test

echo "5. Building production..."
npm run build

echo "6. Running preflight..."
npm run ops:preflight

if [ -f scripts/seed-staging.ts ]; then
  echo "7. Seeding staging data..."
  npx tsx scripts/seed-staging.ts
else
  echo "7. Seed script not present; skipping optional staging seed."
fi

echo "Staging setup complete."
