$ErrorActionPreference = 'Stop'
$API = 'http://127.0.0.1:8000'
$EVID = 'docs/delivery/LO-PBI-001/test_evidence'
if (-not (Test-Path $EVID)) { New-Item -ItemType Directory -Force -Path $EVID | Out-Null }
Start-Transcript -Path ($EVID + '/e2e_console.log') -Append | Out-Null

# Simplified: run Python-based E2E runner directly (avoids PS 5.1 job/redirect quirks)

# Detect Python launcher/interpreter
$python = $null
$args = @()
$cmd = Get-Command py -ErrorAction SilentlyContinue
if ($cmd) { $python = $cmd.Source; $args = @('-3','docs/delivery/LO-PBI-001/test_evidence/run_with_server.py') }
if (-not $python) { $cmd = Get-Command python -ErrorAction SilentlyContinue; if ($cmd) { $python = $cmd.Source; $args = @('docs/delivery/LO-PBI-001/test_evidence/run_with_server.py') } }
if (-not $python) { throw 'Python not found on PATH (neither py nor python)' }

# Set environment for runner
$env:API = $API
$env:TOKEN = 'test-admin'
$env:PYTHONUNBUFFERED = '1'

try {
  Write-Host 'Running Python E2E runner...'
  & $python @args
  $exit = $LASTEXITCODE
  if ($exit -ne 0) { throw "Runner exited with code $exit" }
} finally {
  Stop-Transcript | Out-Null
}
