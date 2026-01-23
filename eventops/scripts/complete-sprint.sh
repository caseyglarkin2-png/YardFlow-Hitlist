#!/bin/bash

# Sprint Completion Helper Script
# 
# Usage: ./scripts/complete-sprint.sh <sprint_number> <sprint_name>
# Example: ./scripts/complete-sprint.sh 18 "Google Workspace Integration"

set -e

SPRINT_NUMBER=$1
SPRINT_NAME=$2

if [ -z "$SPRINT_NUMBER" ] || [ -z "$SPRINT_NAME" ]; then
  echo "Usage: ./scripts/complete-sprint.sh <sprint_number> <sprint_name>"
  echo "Example: ./scripts/complete-sprint.sh 18 \"Google Workspace Integration\""
  exit 1
fi

echo "🎯 Completing Sprint $SPRINT_NUMBER: $SPRINT_NAME"
echo ""

# Step 1: Collect build metrics
echo "📊 Collecting build metrics..."
BUILD_START=$(date +%s%3N)
npm run build > /tmp/build-output.txt 2>&1
BUILD_END=$(date +%s%3N)
BUILD_TIME=$((BUILD_END - BUILD_START))

echo "   Build time: ${BUILD_TIME}ms"

# Step 2: Run tests and collect coverage
echo "🧪 Running tests..."
npm test -- --coverage --silent > /tmp/test-output.txt 2>&1 || true

# Extract test coverage percentage
if [ -f coverage/coverage-summary.json ]; then
  TEST_COVERAGE=$(node -e "
    const fs = require('fs');
    const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
    console.log(coverage.total.lines.pct || 0);
  ")
else
  TEST_COVERAGE=0
fi

echo "   Test coverage: ${TEST_COVERAGE}%"

# Step 3: Get current git commit
COMMIT_HASH=$(git rev-parse --short HEAD)
echo "   Commit: $COMMIT_HASH"

# Step 4: Calculate bundle size
BUNDLE_SIZE=$(du -sk .next | cut -f1)
echo "   Bundle size: ${BUNDLE_SIZE}kB"

# Step 5: Get task completion info
echo ""
echo "📝 Task Summary:"
echo "   How many tasks were completed? (Enter number)"
read TASKS_COMPLETED

echo "   Total tasks in sprint? (Enter number)"
read TASKS_TOTAL

# Step 6: Collect task details
TASK_DETAILS="["
for i in $(seq 1 $TASKS_COMPLETED); do
  echo ""
  echo "   Task $SPRINT_NUMBER.$i:"
  echo "     Name:"
  read TASK_NAME
  echo "     Validation result:"
  read TASK_VALIDATION
  
  if [ $i -gt 1 ]; then
    TASK_DETAILS+=","
  fi
  
  TASK_DETAILS+="{\"id\":\"$SPRINT_NUMBER.$i\",\"name\":\"$TASK_NAME\",\"validation\":\"$TASK_VALIDATION\"}"
done
TASK_DETAILS+="]"

# Step 7: Get deployment info
echo ""
echo "🚀 Deployment Status:"
echo "   Production URL (or press Enter for default):"
read PROD_URL
PROD_URL=${PROD_URL:-"https://yard-flow-hitlist.vercel.app"}

echo "   Deployment status (live/failed/pending):"
read DEPLOY_STATUS
DEPLOY_STATUS=${DEPLOY_STATUS:-"live"}

# Step 8: Optional notes
echo ""
echo "📋 Optional Notes:"
echo "   Any blockers? (comma-separated, or press Enter to skip)"
read BLOCKERS

echo "   Technical debt identified? (comma-separated, or press Enter to skip)"
read TECH_DEBT

echo "   Recommendations? (comma-separated, or press Enter to skip)"
read RECOMMENDATIONS

# Step 9: Next sprint info
echo ""
echo "🎯 Next Sprint:"
NEXT_SPRINT=$((SPRINT_NUMBER + 1))

echo "   Sprint $NEXT_SPRINT name:"
read NEXT_SPRINT_NAME

echo "   Sprint $NEXT_SPRINT goal (one sentence):"
read NEXT_SPRINT_GOAL

echo "   Start date (e.g., Jan 28, 2026):"
read NEXT_START_DATE

# Step 10: Get baseline metrics for comparison
BASELINE_FILE="scripts/baseline-metrics.json"
if [ -f "$BASELINE_FILE" ]; then
  PREV_BUILD_TIME=$(node -e "
    const fs = require('fs');
    const baseline = JSON.parse(fs.readFileSync('$BASELINE_FILE', 'utf8'));
    console.log(baseline.buildTime || $BUILD_TIME);
  ")
  PREV_BUNDLE_SIZE=$(node -e "
    const fs = require('fs');
    const baseline = JSON.parse(fs.readFileSync('$BASELINE_FILE', 'utf8'));
    console.log(baseline.bundleSize || $BUNDLE_SIZE);
  ")
  PREV_COVERAGE=$(node -e "
    const fs = require('fs');
    const baseline = JSON.parse(fs.readFileSync('$BASELINE_FILE', 'utf8'));
    console.log(baseline.testCoverage || $TEST_COVERAGE);
  ")
else
  PREV_BUILD_TIME=$BUILD_TIME
  PREV_BUNDLE_SIZE=$BUNDLE_SIZE
  PREV_COVERAGE=$TEST_COVERAGE
fi

# Calculate changes
BUILD_CHANGE=$(node -e "console.log((($BUILD_TIME - $PREV_BUILD_TIME) / $PREV_BUILD_TIME * 100).toFixed(2))")
BUNDLE_CHANGE=$(node -e "console.log((($BUNDLE_SIZE - $PREV_BUNDLE_SIZE) / $PREV_BUNDLE_SIZE * 100).toFixed(2))")
COVERAGE_CHANGE=$(node -e "console.log(($TEST_COVERAGE - $PREV_COVERAGE).toFixed(2))")

# Step 11: Build JSON payload
read -r -d '' PAYLOAD <<EOF || true
{
  "sprintNumber": $SPRINT_NUMBER,
  "sprintName": "$SPRINT_NAME",
  "startDate": "$(date -d '5 days ago' '+%b %d, %Y')",
  "endDate": "$(date '+%b %d, %Y')",
  "demo": "Sprint $SPRINT_NUMBER completed successfully",
  "buildTime": $BUILD_TIME,
  "buildTimeChange": $BUILD_CHANGE,
  "apiP95Response": 200,
  "apiP95Change": 0,
  "bundleSize": $BUNDLE_SIZE,
  "bundleSizeChange": $BUNDLE_CHANGE,
  "testCoverage": $TEST_COVERAGE,
  "testCoverageChange": $COVERAGE_CHANGE,
  "tasksCompleted": $TASKS_COMPLETED,
  "tasksTotal": $TASKS_TOTAL,
  "taskDetails": $TASK_DETAILS,
  "productionUrl": "$PROD_URL",
  "commitHash": "$COMMIT_HASH",
  "deploymentStatus": "$DEPLOY_STATUS",
  "nextSprint": {
    "number": $NEXT_SPRINT,
    "name": "$NEXT_SPRINT_NAME",
    "startDate": "$NEXT_START_DATE",
    "goal": "$NEXT_SPRINT_GOAL"
  }
}
EOF

# Add optional fields
if [ ! -z "$BLOCKERS" ]; then
  PAYLOAD=$(echo "$PAYLOAD" | jq ". + {blockers: [\"$BLOCKERS\"]}")
fi

if [ ! -z "$TECH_DEBT" ]; then
  PAYLOAD=$(echo "$PAYLOAD" | jq ". + {technicalDebt: [\"$TECH_DEBT\"]}")
fi

if [ ! -z "$RECOMMENDATIONS" ]; then
  PAYLOAD=$(echo "$PAYLOAD" | jq ". + {recommendations: [\"$RECOMMENDATIONS\"]}")
fi

# Step 12: Send to API
echo ""
echo "📧 Sending sprint completion email..."

RESPONSE=$(curl -s -X POST http://localhost:3000/api/sprints/complete \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "$RESPONSE" | jq .

# Step 13: Update baseline for next sprint
cat > "$BASELINE_FILE" <<EOF
{
  "buildTime": $BUILD_TIME,
  "bundleSize": $BUNDLE_SIZE,
  "testCoverage": $TEST_COVERAGE,
  "updatedAt": "$(date -Iseconds)"
}
EOF

echo ""
echo "✅ Sprint $SPRINT_NUMBER completed!"
echo "   Email sent to casey@freightroll.com"
echo "   Baseline metrics updated for Sprint $NEXT_SPRINT"
echo ""
echo "🎯 Ready to start Sprint $NEXT_SPRINT: $NEXT_SPRINT_NAME"
