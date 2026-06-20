# Simulate GitHub Actions CI inside Linux Docker with progress markers and timeout.
# Usage: pwsh ./scripts/ci-linux-docker.ps1 [-TimeoutMinutes 25]
param(
  [int]$TimeoutMinutes = 25
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Step([string]$Message) {
  Write-Host "CI_STEP: $Message"
}

$innerScript = @'
set -euo pipefail
step() { echo "CI_STEP: $1"; }
step apt-install
apt-get update -qq
apt-get install -y -qq openssl ca-certificates > /dev/null
step npm-ci
cd /repo/frontend
npm ci
step prisma-generate
npx prisma generate
mkdir -p ../data
export DATABASE_URL=file:../data/smart-garage.db
step prisma-migrate
npx prisma migrate deploy
step prisma-seed
npx prisma db seed
step lint
npm run lint
step typecheck
npm run typecheck
step build
export UPLOAD_DIR=../data/uploads
npm run build
step done
'@

Write-Step "start repo=$repoRoot timeout=${TimeoutMinutes}m"

$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$dockerArgs = @(
  "run", "--rm",
  "-v", "${repoRoot}:/repo",
  "-v", "smart-garage-ci-node-modules:/repo/frontend/node_modules",
  "-w", "/repo",
  "node:22-bookworm-slim",
  "bash", "-lc", $innerScript
)

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "docker"
$psi.Arguments = ($dockerArgs | ForEach-Object {
  if ($_ -match '\s') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
}) -join " "
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$proc = [System.Diagnostics.Process]::Start($psi)
$failed = $false

while (-not $proc.HasExited) {
  if ((Get-Date) -gt $deadline) {
    try { $proc.Kill($true) } catch { }
    Write-Step "failed reason=timeout after ${TimeoutMinutes} minutes"
    exit 124
  }
  Start-Sleep -Milliseconds 500
}

$stdout = $proc.StandardOutput.ReadToEnd()
$stderr = $proc.StandardError.ReadToEnd()
if ($stdout) { Write-Host $stdout }
if ($stderr) { Write-Host $stderr }

$code = $proc.ExitCode
if ($code -ne 0) {
  Write-Step "failed reason=docker-exit-$code"
  exit $code
}
if ($stdout -notmatch "CI_STEP: done") {
  Write-Step "failed reason=missing-done-marker"
  exit 1
}

Write-Step "success"
exit 0
