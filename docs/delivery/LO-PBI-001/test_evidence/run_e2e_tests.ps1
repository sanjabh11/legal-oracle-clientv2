$ErrorActionPreference = 'Stop'
$API = 'http://127.0.0.1:8000'
$TOKEN = 'test-admin'
$EVID = 'docs/delivery/LO-PBI-001/test_evidence'

# Ensure evidence directory exists
if (-not (Test-Path $EVID)) { New-Item -ItemType Directory -Force -Path $EVID | Out-Null }

# Wait for readiness (admin health)
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/admin/health') -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ready) { throw 'Server not ready' }

$headers = @{ Authorization = ('Bearer ' + $TOKEN) }

# --- Admin ---
Write-Host '=== Admin Health ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/admin/health')).Content
$c | Write-Host
$c | Set-Content ($EVID + '/admin_health.json') -Encoding utf8

Write-Host '=== Admin Metrics ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/admin/metrics') -Headers $headers).Content
$c | Write-Host
$c | Set-Content ($EVID + '/admin_metrics.json') -Encoding utf8

Write-Host '=== Admin Datasets ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/admin/datasets') -Headers $headers).Content
$c | Write-Host
$c | Set-Content ($EVID + '/admin_datasets.json') -Encoding utf8

# --- Datasets ---
Write-Host '=== Datasets List ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/datasets') -Headers $headers).Content
$c | Write-Host
$c | Set-Content ($EVID + '/datasets_list.json') -Encoding utf8

$body1 = @'
{
  "keywords": ["arbitration"],
  "fields": ["title", "body"],
  "date_range": {"from": null, "to": null},
  "limit": 2
}
'@
Write-Host '=== Dataset Search ==='
$c = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($API + '/api/v1/datasets/caselaw/search') -Headers (@{ 'Content-Type'='application/json' } + $headers) -Body $body1).Content
$c | Write-Host
$c | Set-Content ($EVID + '/dataset_search.json') -Encoding utf8

$body2 = @'
{
  "query": "contract breach damages",
  "limit": 2
}
'@
Write-Host '=== Dataset Semantic Search ==='
$c = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($API + '/api/v1/datasets/caselaw/semantic_search') -Headers (@{ 'Content-Type'='application/json' } + $headers) -Body $body2).Content
$c | Write-Host
$c | Set-Content ($EVID + '/dataset_semantic.json') -Encoding utf8

# --- Export ---
Write-Host '=== Export CSV ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/export/datasets/caselaw/csv') -Headers $headers).Content
$c | Write-Host
$c | Set-Content ($EVID + '/export.csv') -Encoding utf8

Write-Host '=== Export JSON ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/export/datasets/caselaw/json') -Headers $headers).Content
$c | Write-Host
$c | Set-Content ($EVID + '/export.json') -Encoding utf8

# --- Caselaw ---
Write-Host '=== Caselaw Stats ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/caselaw/stats') -Headers $headers).Content
$c | Write-Host
$c | Set-Content ($EVID + '/caselaw_stats.json') -Encoding utf8

Write-Host '=== Caselaw Case ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/caselaw/case/CASE1') -Headers $headers).Content
$c | Write-Host
$c | Set-Content ($EVID + '/caselaw_case.json') -Encoding utf8

$body3 = @'
{
  "filters": {"jurisdiction": ["US-CA"]},
  "limit": 1
}
'@
Write-Host '=== Caselaw Filter Search ==='
$c = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($API + '/api/v1/caselaw/filter-search') -Headers (@{ 'Content-Type'='application/json' } + $headers) -Body $body3).Content
$c | Write-Host
$c | Set-Content ($EVID + '/caselaw_filter.json') -Encoding utf8

$body4 = @'
{
  "query": "precedent for arbitration clause"
}
'@
Write-Host '=== Caselaw Similarity ==='
$c = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($API + '/api/v1/caselaw/similarity-search') -Headers (@{ 'Content-Type'='application/json' } + $headers) -Body $body4).Content
$c | Write-Host
$c | Set-Content ($EVID + '/caselaw_similarity.json') -Encoding utf8

$body5 = @'
{
  "judge_name": "Hon. Jane Doe"
}
'@
Write-Host '=== Caselaw Judge Analysis ==='
$c = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($API + '/api/v1/caselaw/judge-analysis') -Headers (@{ 'Content-Type'='application/json' } + $headers) -Body $body5).Content
$c | Write-Host
$c | Set-Content ($EVID + '/caselaw_judge.json') -Encoding utf8

# --- Core ---
$body6 = @'
{
  "case_type": "civil",
  "jurisdiction": "US-CA",
  "key_facts": ["contract breach"],
  "judge_id": null
}
'@
Write-Host '=== Outcome Predict ==='
$c = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($API + '/api/v1/outcome/predict') -Headers (@{ 'Content-Type'='application/json' } + $headers) -Body $body6).Content
$c | Write-Host
$c | Set-Content ($EVID + '/outcome_predict.json') -Encoding utf8

$body7 = @'
{
  "case_id": "stub-123",
  "strategies": ["settlement", "motion"]
}
'@
Write-Host '=== Strategy Optimize ==='
$c = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($API + '/api/v1/strategy/optimize') -Headers (@{ 'Content-Type'='application/json' } + $headers) -Body $body7).Content
$c | Write-Host
$c | Set-Content ($EVID + '/strategy_optimize.json') -Encoding utf8

$body8 = @'
{
  "case_id": "stub-123",
  "strategy": "settlement",
  "opponent_type": null,
  "simulation_parameters": {}
}
'@
Write-Host '=== Simulation Run ==='
$c = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($API + '/api/v1/simulation/run') -Headers (@{ 'Content-Type'='application/json' } + $headers) -Body $body8).Content
$c | Write-Host
$c | Set-Content ($EVID + '/simulation_run.json') -Encoding utf8

Write-Host '=== Trends Forecast ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/trends/forecast?industry=fintech&jurisdictions=US,EU&time_horizon=12m') -Headers $headers).Content
$c | Write-Host
$c | Set-Content ($EVID + '/trends_forecast.json') -Encoding utf8

Write-Host '=== Jurisdiction Optimize ==='
$c = (Invoke-WebRequest -UseBasicParsing -Uri ($API + '/api/v1/jurisdiction/optimize?case_type=civil&key_facts=contract%20breach&preferred_outcome=win') -Headers $headers).Content
$c | Write-Host
$c | Set-Content ($EVID + '/jurisdiction_optimize.json') -Encoding utf8

$body9 = @'
{
  "jurisdiction": null,
  "industry": "fintech",
  "requirements": ["KYC", "AML"],
  "risk_tolerance": "medium"
}
'@
Write-Host '=== Compliance Optimize ==='
$c = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($API + '/api/v1/compliance/optimize') -Headers (@{ 'Content-Type'='application/json' } + $headers) -Body $body9).Content
$c | Write-Host
$c | Set-Content ($EVID + '/compliance_optimize.json') -Encoding utf8

Write-Host 'OK'
