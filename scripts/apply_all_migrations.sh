#!/bin/bash
# Complete Migration Application Script
# This script applies all database migrations to Supabase

echo "=========================================="
echo "LEGAL ORACLE - DATABASE MIGRATION"
echo "=========================================="
echo ""

PROJECT_REF="kvunnankqgfokeufvsrv"
DB_PASSWORD="hwqEgOHND8rKkKnT"

echo "Step 1: Applying base schema..."
supabase db execute -f docs/delivery/LO-PBI-001/migrations.sql

if [ $? -eq 0 ]; then
    echo "[OK] Base schema applied successfully"
else
    echo "[FAIL] Base schema failed - check errors above"
    exit 1
fi

echo ""
echo "Step 2: Applying compliance framework schema..."
supabase db execute -f docs/delivery/LO-PBI-001/sql/002_compliance_framework.sql

if [ $? -eq 0 ]; then
    echo "[OK] Compliance schema applied successfully"
else
    echo "[FAIL] Compliance schema failed - check errors above"
    exit 1
fi

echo ""
echo "=========================================="
echo "MIGRATION COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run: cd stub_api && python seed_data.py"
echo "2. Test: python test_supabase.py"
echo ""
