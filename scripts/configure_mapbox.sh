#!/usr/bin/env bash
set -e

ENV_FILE="$(dirname "$0")/../.env"

echo "=========================================================="
echo " MaybeWe — Secure Mapbox Token Configuration"
echo "=========================================================="
echo "This tool securely registers your Mapbox tokens without echoing"
echo "them to the screen, logs, or chat."
echo ""

# 1. Places Backend Token (sk.* or dedicated server token)
echo "1/3: Places Backend Token (Stored in Supabase Secrets as MAPBOX_ACCESS_TOKEN)"
printf "Enter Places Backend Token: "
read -s PLACES_TOKEN
echo ""
if [[ -z "$PLACES_TOKEN" ]]; then
  echo "Error: Places token cannot be empty."
  exit 1
fi

echo "Setting MAPBOX_ACCESS_TOKEN in Supabase Secrets..."
npx supabase secrets set MAPBOX_ACCESS_TOKEN="$PLACES_TOKEN" >/dev/null
echo "✓ Supabase Secret MAPBOX_ACCESS_TOKEN successfully updated."
echo ""

# 2. Web Client Public Token (pk.*)
echo "2/3: Web Map Client Token (Restricted to web URLs, stored in .env)"
printf "Enter Web Public Token (pk.*): "
read -s WEB_TOKEN
echo ""
if [[ -z "$WEB_TOKEN" ]]; then
  echo "Error: Web token cannot be empty."
  exit 1
fi

# 3. Mobile Client Public Token (pk.*)
echo "3/3: Mobile Map Client Token (Unrestricted for WebView, stored in .env)"
printf "Enter Mobile Public Token (pk.*): "
read -s MOBILE_TOKEN
echo ""
if [[ -z "$MOBILE_TOKEN" ]]; then
  echo "Error: Mobile token cannot be empty."
  exit 1
fi

# Update .env safely without exposing tokens
sed -i '' '/EXPO_PUBLIC_MAPBOX_WEB_TOKEN/d' "$ENV_FILE" 2>/dev/null || true
sed -i '' '/EXPO_PUBLIC_MAPBOX_MOBILE_TOKEN/d' "$ENV_FILE" 2>/dev/null || true

echo "EXPO_PUBLIC_MAPBOX_WEB_TOKEN=$WEB_TOKEN" >> "$ENV_FILE"
echo "EXPO_PUBLIC_MAPBOX_MOBILE_TOKEN=$MOBILE_TOKEN" >> "$ENV_FILE"
echo "✓ .env successfully updated with EXPO_PUBLIC_MAPBOX_WEB_TOKEN and EXPO_PUBLIC_MAPBOX_MOBILE_TOKEN."
echo ""
echo "=========================================================="
echo " Configuration complete! You can now notify Antigravity to run the live test."
echo "=========================================================="
