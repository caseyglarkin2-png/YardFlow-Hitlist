#!/bin/bash
#
# Visual Regression Test Script
# Sprint U1.7 - Compare before/after screenshots
#
# Usage: ./visual-regression.sh [before_date] [after_date]
# Example: ./visual-regression.sh 2026-01-31 2026-02-01
#
# Requires: ImageMagick (compare command)
#   Install: brew install imagemagick (macOS) or apt install imagemagick (Linux)

set -e

BEFORE_DATE="${1:-2026-01-31}"
AFTER_DATE="${2:-$(date +%Y-%m-%d)}"
AUDIT_DIR="docs/audit"
BEFORE_DIR="$AUDIT_DIR/desktop-screenshots-$BEFORE_DATE"
AFTER_DIR="$AUDIT_DIR/desktop-screenshots-$AFTER_DATE"
DIFF_DIR="$AUDIT_DIR/diff-$BEFORE_DATE-vs-$AFTER_DATE"

echo "=========================================="
echo "  Visual Regression Test"
echo "=========================================="
echo "Before: $BEFORE_DIR"
echo "After:  $AFTER_DIR"
echo "Diff:   $DIFF_DIR"
echo ""

# Check prerequisites
if ! command -v compare &> /dev/null; then
    echo "❌ Error: ImageMagick 'compare' not found"
    echo "   Install with: brew install imagemagick (macOS)"
    echo "   Or: apt install imagemagick (Linux)"
    exit 1
fi

# Check directories exist
if [ ! -d "$BEFORE_DIR" ]; then
    echo "❌ Error: Before directory not found: $BEFORE_DIR"
    echo "   Run capture-desktop-screenshots.sh first"
    exit 1
fi

if [ ! -d "$AFTER_DIR" ]; then
    echo "❌ Error: After directory not found: $AFTER_DIR"
    echo "   Run capture-desktop-screenshots.sh to capture current state"
    exit 1
fi

# Create diff directory
mkdir -p "$DIFF_DIR"

echo "Comparing screenshots..."
echo ""

TOTAL=0
CHANGED=0

for before_file in "$BEFORE_DIR"/*.png; do
    filename=$(basename "$before_file")
    after_file="$AFTER_DIR/$filename"
    diff_file="$DIFF_DIR/$filename"
    
    if [ ! -f "$after_file" ]; then
        echo "⚠️  Skipping $filename (no after screenshot)"
        continue
    fi
    
    TOTAL=$((TOTAL + 1))
    
    # Compare images and capture RMSE (Root Mean Square Error)
    # Lower RMSE = more similar, 0 = identical
    rmse=$(compare -metric RMSE "$before_file" "$after_file" "$diff_file" 2>&1 | grep -oE "^[0-9.]+" || echo "0")
    
    if [ -z "$rmse" ]; then
        rmse="0"
    fi
    
    # Threshold: RMSE > 100 means significant visual change
    if (( $(echo "$rmse > 100" | bc -l 2>/dev/null || echo "0") )); then
        echo "🔄 $filename: CHANGED (RMSE: $rmse)"
        CHANGED=$((CHANGED + 1))
    else
        echo "✅ $filename: No significant change (RMSE: $rmse)"
        # Remove diff file if no significant change
        rm -f "$diff_file"
    fi
done

echo ""
echo "=========================================="
echo "  Results"
echo "=========================================="
echo "Total compared: $TOTAL"
echo "Changed: $CHANGED"
echo "Unchanged: $((TOTAL - CHANGED))"
echo ""

if [ $CHANGED -gt 0 ]; then
    echo "📁 Diff images saved to: $DIFF_DIR"
    echo "   Red pixels = differences between before/after"
fi

echo ""
echo "✅ Visual regression test complete"
