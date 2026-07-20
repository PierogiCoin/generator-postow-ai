#!/usr/bin/env bash
# Tworzy produkty/ceny Generator Postów AI + webhook produkcyjny (Stripe test mode przez CLI).
set -euo pipefail

APP_META="generator-postow-ai"
WEBHOOK_URL="${WEBHOOK_URL:-https://generator-postow-api-production.up.railway.app/api/payments/webhook}"
OUT_FILE="${OUT_FILE:-/tmp/generator-postow-stripe-env.txt}"

: > "$OUT_FILE"

find_price_by_interval() {
  local product_id="$1"
  local interval="$2"
  stripe prices list --product "$product_id" --active=true --limit 100 \
    | python3 -c "
import sys, json
interval = sys.argv[1]
for p in json.load(sys.stdin).get('data', []):
    r = p.get('recurring') or {}
    if r.get('interval') == interval:
        print(p['id'])
        break
" "$interval"
}

create_sub() {
  local plan_key="$1"
  local name="$2"
  local amount_cents="$3"
  local interval="${4:-month}"

  local existing
  existing=$(stripe products search --query "metadata['app']:'${APP_META}' AND metadata['plan_key']:'${plan_key}'" --limit 1 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')" || true)

  local product_id
  if [[ -n "$existing" ]]; then
    product_id="$existing"
    echo "↪ Produkt istnieje: $name ($product_id)"
  else
    product_id=$(stripe products create \
      -d "name=${name}" \
      -d "metadata[app]=${APP_META}" \
      -d "metadata[plan_key]=${plan_key}" \
      -d "metadata[type]=subscription" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
    echo "✓ Utworzono produkt: $name ($product_id)"
  fi

  local price_id
  price_id=$(find_price_by_interval "$product_id" "$interval")

  if [[ -z "$price_id" ]]; then
    price_id=$(stripe prices create \
      -d "product=${product_id}" \
      -d "unit_amount=${amount_cents}" \
      -d "currency=usd" \
      -d "recurring[interval]=${interval}" \
      -d "metadata[app]=${APP_META}" \
      -d "metadata[plan_key]=${plan_key}" \
      -d "metadata[interval]=${interval}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
    echo "  + cena (${interval}): $price_id"
  else
    echo "  ↪ cena (${interval}): $price_id"
  fi

  local env_key
  local suffix=""
  [[ "$interval" == "year" ]] && suffix="_YEARLY"
  case "$plan_key" in
    creator) env_key="STRIPE_CREATOR${suffix}_PRICE_ID" ;;
    pro) env_key="STRIPE_PRO${suffix}_PRICE_ID" ;;
    business) env_key="STRIPE_BUSINESS${suffix}_PRICE_ID" ;;
    agency) env_key="STRIPE_AGENCY${suffix}_PRICE_ID" ;;
    enterprise) env_key="STRIPE_ENTERPRISE${suffix}_PRICE_ID" ;;
  esac
  echo "${env_key}=${price_id}" >> "$OUT_FILE"
}

create_pack() {
  local plan_key="$1"
  local name="$2"
  local amount_cents="$3"

  local existing
  existing=$(stripe products search --query "metadata['app']:'${APP_META}' AND metadata['plan_key']:'${plan_key}'" --limit 1 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')" || true)

  local product_id
  if [[ -n "$existing" ]]; then
    product_id="$existing"
    echo "↪ Pakiet istnieje: $name ($product_id)"
  else
    product_id=$(stripe products create \
      -d "name=${name}" \
      -d "metadata[app]=${APP_META}" \
      -d "metadata[plan_key]=${plan_key}" \
      -d "metadata[type]=credit_pack" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
    echo "✓ Utworzono pakiet: $name ($product_id)"
  fi

  local price_id
  price_id=$(stripe prices list --product "$product_id" --active=true --limit 1 \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')")

  if [[ -z "$price_id" ]]; then
    price_id=$(stripe prices create \
      -d "product=${product_id}" \
      -d "unit_amount=${amount_cents}" \
      -d "currency=usd" \
      -d "metadata[app]=${APP_META}" \
      -d "metadata[plan_key]=${plan_key}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
    echo "  + cena: $price_id"
  else
    echo "  ↪ cena: $price_id"
  fi

  local env_key
  case "$plan_key" in
    credits_small) env_key="STRIPE_CREDITS_SMALL_PRICE_ID" ;;
    credits_medium) env_key="STRIPE_CREDITS_MEDIUM_PRICE_ID" ;;
    credits_large) env_key="STRIPE_CREDITS_LARGE_PRICE_ID" ;;
    credits_mega) env_key="STRIPE_CREDITS_MEGA_PRICE_ID" ;;
  esac
  echo "${env_key}=${price_id}" >> "$OUT_FILE"
}

echo "=== Subskrypcje (USD / mies.) ==="
create_sub creator "Generator Postów AI — Creator" 2900 month
create_sub pro "Generator Postów AI — Pro" 4900 month
create_sub business "Generator Postów AI — Business" 9900 month
create_sub agency "Generator Postów AI — Agency" 24900 month
create_sub enterprise "Generator Postów AI — Enterprise" 29900 month

echo ""
echo "=== Subskrypcje (USD / rok — 10× miesiąc, 2 miesiące gratis) ==="
create_sub creator "Generator Postów AI — Creator" 29000 year
create_sub pro "Generator Postów AI — Pro" 49000 year
create_sub business "Generator Postów AI — Business" 99000 year
create_sub agency "Generator Postów AI — Agency" 249000 year
create_sub enterprise "Generator Postów AI — Enterprise" 299000 year

echo ""
echo "=== Pakiety kredytów (one-time) ==="
create_pack credits_small "Generator Postów AI — Credits Small (400)" 999
create_pack credits_medium "Generator Postów AI — Credits Medium (1100)" 2499
create_pack credits_large "Generator Postów AI — Credits Large (2600)" 4999
create_pack credits_mega "Generator Postów AI — Credits Mega (7000)" 9999

echo ""
echo "=== Webhook ==="
WEBHOOK_JSON=$(stripe webhook_endpoints list --limit 100)
EXISTING_WE=$(echo "$WEBHOOK_JSON" | python3 -c "
import sys,json,os
url=os.environ.get('WEBHOOK_URL','')
for w in json.load(sys.stdin).get('data',[]):
    if w.get('url')==url:
        print(w['id'])
        break
")

if [[ -n "$EXISTING_WE" ]]; then
  echo "↪ Webhook już istnieje: $EXISTING_WE"
  echo "  URL: $WEBHOOK_URL"
  echo "  (secret nie jest ponownie wyświetlany — użyj Dashboard lub utwórz nowy endpoint)"
else
  WE_JSON=$(stripe webhook_endpoints create \
    --url="$WEBHOOK_URL" \
    -d "description=Generator Postów AI — Railway production" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=customer.subscription.created" \
    -d "enabled_events[]=customer.subscription.updated" \
    -d "enabled_events[]=customer.subscription.deleted" \
    -d "enabled_events[]=invoice.payment_succeeded" \
    -d "enabled_events[]=invoice.payment_failed" \
    )
  WHSEC=$(echo "$WE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['secret'])")
  WE_ID=$(echo "$WE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  echo "✓ Webhook utworzony: $WE_ID"
  echo "STRIPE_WEBHOOK_SECRET=${WHSEC}" >> "$OUT_FILE"
  echo "  secret zapisany do $OUT_FILE"
fi

echo ""
echo "=== Zmienne env (Railway) ==="
cat "$OUT_FILE"
echo ""
echo "Plik: $OUT_FILE"
