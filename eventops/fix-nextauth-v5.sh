#!/bin/bash

# Fix NextAuth v5 imports - simple and safe approach

files=(
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

for file in "${files[@]}"; do
  echo "Fixing $file..."
  
  # 1. Replace the import statements
  sed -i "s/import { getServerSession } from 'next-auth';/import { auth } from '@\/auth';/" "$file"
  
  # 2. Remove the authOptions import line
  sed -i "/import { authOptions } from '@\/auth';/d" "$file"
  
  # 3. Replace the function call
  sed -i 's/getServerSession(authOptions)/auth()/g' "$file"
  
  echo "✅ Fixed $file"
done

echo ""
echo "All files fixed! Testing build..."
npm run build
