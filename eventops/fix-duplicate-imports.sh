#!/bin/bash
# Remove duplicate auth imports

FILES=(
  "src/app/api/ai/dossier/generate/route.ts"
  "src/app/api/ai/content/generate/route.ts"
  "src/app/api/ai/content/sequence/route.ts"
  "src/app/api/enrichment/company/enrich/route.ts"
  "src/app/api/enrichment/company/batch/route.ts"
  "src/app/api/enrichment/patterns/apply/route.ts"
  "src/app/api/enrichment/patterns/batch/route.ts"
  "src/app/api/enrichment/patterns/detect/route.ts"
  "src/app/api/enrichment/validate/route.ts"
  "src/app/api/enrichment/linkedin/discover/route.ts"
  "src/app/api/enrichment/linkedin/enrich-all/route.ts"
  "src/app/api/enrichment/linkedin/enrich-company/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Create temp file with unique imports only
    awk '!seen[$0]++' "$file" > "$file.tmp"
    mv "$file.tmp" "$file"
    echo "  ✅ Fixed $file"
  fi
done

echo "✅ All duplicates removed!"
