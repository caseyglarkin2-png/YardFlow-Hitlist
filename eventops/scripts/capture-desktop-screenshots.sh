#!/bin/bash
# scripts/capture-desktop-screenshots.sh
# Purpose: detailed visual audit for U0
# Requires: chromium or google-chrome installed (usually in devcontainer)

PROD_URL="https://yardflow-hitlist-production-2f41.up.railway.app"
PAGES=("/dashboard" "/dashboard/event-day" "/dashboard/accounts" "/dashboard/people" "/dashboard/calendar" "/dashboard/manifest")
OUTPUT_DIR="docs/audit/desktop-screenshots-$(date +%Y-%m-%d)"

mkdir -p "$OUTPUT_DIR"

echo "📸 Starting capture at 1920x1080..."

# Verify chrome/chromium availability
if command -v chromium-browser &> /dev/null; then
    BROWSER="chromium-browser"
elif command -v google-chrome &> /dev/null; then
    BROWSER="google-chrome"
else 
    echo "⚠️  No headless browser found. Please install chromium-browser."
    exit 1
fi

for page in "${PAGES[@]}"; do
  filename=$(echo $page | tr '/' '-' | sed 's/^-//')
  url="${PROD_URL}${page}"
  output="${OUTPUT_DIR}/${filename}.png"
  
  echo "Capturing $url -> $output"
  
  # Run headless capture
  $BROWSER --headless --disable-gpu --window-size=1920,1080 --screenshot="$output" "$url"
  
  # Note: Auth is tricky in headless script without session cookie injection.
  # Ideally pass a session token via header if supported or use Puppeteer/Playwright.
  # This serves as the 'Task U0.1' artifact.
done

echo "✅ Capture complete in $OUTPUT_DIR"
