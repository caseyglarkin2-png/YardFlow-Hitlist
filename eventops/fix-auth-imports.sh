#!/bin/bash
# Fix NextAuth v5 imports across all API routes

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
    # Remove old imports
    sed -i "/import { getServerSession } from 'next-auth';/d" "$file"
    sed -i "/import { authOptions } from '@\/auth';/d" "$file"
    # Add new import at top
    sed -i '1i import { auth } from '\''@/auth'\'';' "$file"
    # Replace getServerSession(authOptions) with auth()
    sed -i "s/const session = await getServerSession(authOptions);/const session = await auth();/g" "$file"
    echo "  ✅ Fixed $file"
  fi
done

echo "✅ All files fixed!"
