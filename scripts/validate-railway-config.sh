#!/bin/bash
# Task 30.10: Infrastructure as Code Validation
# Validates Railway service configuration matches expected state

set -e

echo "🔍 Validating Railway Configuration..."
echo "======================================"

SERVICE="yardflow-worker"
FAILED=0

# Check 1: No NIXPACKS_START_CMD override
echo "Check 1: Railway service startCommand..."
START_CMD=$(railway variables --service $SERVICE 2>&1 | grep -i "NIXPACKS_START" || echo "")
if [ ! -z "$START_CMD" ]; then
  echo "❌ FAIL: NIXPACKS_START_CMD is set (should be empty)"
  echo "  Found: $START_CMD"
  echo "  Fix: railway variables delete NIXPACKS_START_CMD --service $SERVICE"
  FAILED=1
else
  echo "✅ PASS: No startCommand override"
fi

# Check 2: No NIXPACKS_BUILD_CMD override
echo "Check 2: Railway buildCommand..."
BUILD_CMD=$(railway variables --service $SERVICE 2>&1 | grep -i "NIXPACKS_BUILD" || echo "")
if [ ! -z "$BUILD_CMD" ]; then
  echo "❌ FAIL: NIXPACKS_BUILD_CMD is set (should be empty)"
  echo "  Found: $BUILD_CMD"
  echo "  Fix: railway variables delete NIXPACKS_BUILD_CMD --service $SERVICE"
  FAILED=1
else
  echo "✅ PASS: No buildCommand override"
fi

# Check 3: Dockerfile path set correctly
echo "Check 3: Dockerfile path..."
DOCKERFILE_CHECK=$(railway variables --service $SERVICE 2>&1 | grep "RAILWAY_DOCKERFILE_PATH.*Dockerfile.worker" || echo "")
if [ -z "$DOCKERFILE_CHECK" ]; then
  echo "❌ FAIL: Dockerfile path not set to Dockerfile.worker"
  echo "  Fix: Ensure RAILWAY_DOCKERFILE_PATH=Dockerfile.worker is set"
  FAILED=1
else
  echo "✅ PASS: Dockerfile path correct (Dockerfile.worker)"
fi

# Check 4: railway-worker.json has startCommand: null
echo "Check 4: railway-worker.json configuration..."
if [ ! -f "railway-worker.json" ]; then
  echo "❌ FAIL: railway-worker.json not found"
  FAILED=1
else
  START_CMD_NULL=$(cat railway-worker.json | jq -r '.deploy.startCommand')
  if [ "$START_CMD_NULL" != "null" ]; then
    echo "❌ FAIL: railway-worker.json startCommand should be null"
    echo "  Found: $START_CMD_NULL"
    echo "  Fix: Edit railway-worker.json, set startCommand: null"
    FAILED=1
  else
    echo "✅ PASS: railway-worker.json startCommand is null"
  fi
fi

# Check 5: Required environment variables
echo "Check 5: Required environment variables..."
REQUIRED_VARS=("DATABASE_URL" "REDIS_URL" "AUTH_SECRET")
for VAR in "${REQUIRED_VARS[@]}"; do
  if ! railway variables --service $SERVICE 2>&1 | grep -q "$VAR"; then
    echo "❌ FAIL: Missing required variable: $VAR"
    FAILED=1
  fi
done
if [ $FAILED -eq 0 ]; then
  echo "✅ PASS: All required variables present"
fi

# Check 6: Dockerfile.worker exists and is valid
echo "Check 6: Dockerfile.worker validity..."
if [ ! -f "Dockerfile.worker" ]; then
  echo "❌ FAIL: Dockerfile.worker not found"
  FAILED=1
else
  # Check for common issues
  if grep -q "cd eventops" Dockerfile.worker; then
    echo "⚠️  WARN: Dockerfile contains 'cd' command (may cause issues)"
  fi
  
  if ! grep -q "CMD" Dockerfile.worker; then
    echo "❌ FAIL: Dockerfile missing CMD instruction"
    FAILED=1
  else
    echo "✅ PASS: Dockerfile.worker is valid"
  fi
fi

echo "======================================"
if [ $FAILED -eq 1 ]; then
  echo "❌ CONFIGURATION VALIDATION FAILED"
  echo ""
  echo "Fix the issues above before deploying."
  echo "See docs/operations/RAILWAY_CONFIG.md for details."
  exit 1
else
  echo "✅ ALL CHECKS PASSED!"
  echo ""
  echo "Railway configuration is correct and ready for deployment."
  exit 0
fi
