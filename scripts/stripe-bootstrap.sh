#!/usr/bin/env bash
# Tworzy produkty/ceny Generator Postów AI + webhook produkcyjny (Stripe test mode przez CLI).
set -euo pipefail

APP_META="generator-postow-ai"
WEBHOOK_URL="${WEBHOOK_URL:-https://generator-postow-api-production.up.railway.app/api/payments/webhook}"
OUT_FILE="${OUT_FILE:-/tmp/generator-postow-stripe-env.txt}"

: > "$OUT_FILE"

create_sub() {
  local plan_key="$1"
  local name="$2"
  local amount_cents="$3"

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
  price_id=$(stripe prices list --product "$product_id" --active=true --limit 1 \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')")

  if [[ -z "$price_id" ]]; then
    price_id=$(stripe prices create \
      -d "product=${product_id}" \
      -d "unit_amount=${amount_cents}" \
      -d "currency=usd" \
      -d "recurring[interval]=month" \
      -d "metadata[app]=${APP_META}" \
      -d "metadata[plan_key]=${plan_key}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
    echo "  + cena: $price_id"
  else
    echo "  ↪ cena: $price_id"
  fi

  local env_key
  case "$plan_key" in
    creator) env_key="STRIPE_CREATOR_PRICE_ID" ;;
    pro) env_key="STRIPE_PRO_PRICE_ID" ;;
    business) env_key="STRIPE_BUSINESS_PRICE_ID" ;;
    agency) env_key="STRIPE_AGENCY_PRICE_ID" ;;
    enterprise) env_key="STRIPE_ENTERPRISE_PRICE_ID" ;;
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
create_sub creator "Generator Postów AI — Creator" 2900
create_sub pro "Generator Postów AI — Pro" 4900
create_sub business "Generator Postów AI — Business" 9900
create_sub agency "Generator Postów AI — Agency" 24900
create_sub enterprise "Generator Postów AI — Enterprise" 29900

echo ""
echo "=== Pakiety kredytów (one-time) ==="
create_pack credits_small "Generator Postów AI — Credits Small (500)" 999
create_pack credits_medium "Generator Postów AI — Credits Medium (1500)" 2499
create_pack credits_large "Generator Postów AI — Credits Large (3500)" 4999
create_pack credits_mega "Generator Postów AI — Credits Mega (10000)" 9999

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
