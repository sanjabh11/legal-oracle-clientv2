# PowerShell Migration Script for Windows
# Applies all database migrations to Supabase

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "LEGAL ORACLE - DATABASE MIGRATION" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_REF = "kvunnankqgfokeufvsrv"

Write-Host "Step 1: Applying base schema..." -ForegroundColor Yellow
supabase db execute -f docs/delivery/LO-PBI-001/migrations.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Base schema applied successfully" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Base schema failed - check errors above" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Applying compliance framework schema..." -ForegroundColor Yellow
supabase db execute -f docs/delivery/LO-PBI-001/sql/002_compliance_framework.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Compliance schema applied successfully" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Compliance schema failed - check errors above" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "MIGRATION COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: cd stub_api; python seed_data.py"
Write-Host "2. Test: python test_supabase.py"
Write-Host ""
