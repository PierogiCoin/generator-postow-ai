#!/bin/bash
mkdir -p audit
echo "=== 1. LIGHTHOUSE MOBILE ===" > audit/results.txt
npx lighthouse https://generator-postow-ai.vercel.app/dashboard \
  --chrome-flags="--headless" --output=json \
  --output-path=./audit/lighthouse-mobile.json 2>/dev/null

node -e "const r=require('./audit/lighthouse-mobile.json'); console.log('Mobile Performance:', r.categories.performance.score*100); console.log('Mobile Accessibility:', r.categories.accessibility.score*100); console.log('LCP:', r.audits['largest-contentful-paint'].displayValue); console.log('INP:', r.audits['interaction-to-next-paint']?.displayValue || 'N/A'); console.log('CLS:', r.audits['cumulative-layout-shift'].displayValue);" >> audit/results.txt

echo -e "\n=== 2. LIGHTHOUSE DESKTOP ===" >> audit/results.txt
npx lighthouse https://generator-postow-ai.vercel.app/dashboard \
  --preset=desktop --chrome-flags="--headless" --output=json \
  --output-path=./audit/lighthouse-desktop.json 2>/dev/null

node -e "const r=require('./audit/lighthouse-desktop.json'); console.log('Desktop Performance:', r.categories.performance.score*100);" >> audit/results.txt

echo -e "\n=== 3. TTFB (3 próby) ===" >> audit/results.txt
for i in 1 2 3; do
  curl -o /dev/null -s -w "Próba $i: time_starttransfer=%{time_starttransfer}s (TTFB), time_total=%{time_total}s\n" \
    https://generator-postow-ai.vercel.app/ >> audit/results.txt
done

echo -e "\n=== 4. GOOGLEBOT CHECK ===" >> audit/results.txt
curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1)" \
  https://generator-postow-ai.vercel.app/dashboard | grep -o '<title>.*</title>' >> audit/results.txt || echo "BRAK <title> DLA GOOGLEBOTA" >> audit/results.txt

echo -e "\n=== 5. BUNDLE SIZE ===" >> audit/results.txt
du -h dist/assets/*.js 2>/dev/null | sort -rh | head -5 >> audit/results.txt

echo "Gotowe. Wyniki w ./audit/results.txt"
cat audit/results.txt
