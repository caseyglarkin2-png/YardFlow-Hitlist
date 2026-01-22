#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Get database URL from .env.local
if [ -f .env.local ]; then
  source .env.local
elif [ -f .env ]; then
  source .env
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not found in .env or .env.local"
  exit 1
fi

echo "Creating backup: $BACKUP_FILE"

# Dump database
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

echo "✅ Backup created: ${BACKUP_FILE}.gz"
echo "   Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"

# Keep only last 7 backups
ls -t $BACKUP_DIR/backup_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "✅ Old backups cleaned up"
