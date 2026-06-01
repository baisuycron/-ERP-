$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$stableScript = Join-Path $root "dev-server-stable.ps1"
Set-Location $root

if (-not (Test-Path $stableScript)) {
  throw "Missing stable Vite launcher at $stableScript"
}

function Test-DevServerReachable {
  try {
    $statusCode = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5173" -TimeoutSec 3 | Select-Object -ExpandProperty StatusCode
    return ($statusCode -eq 200)
  } catch {
    return $false
  }
}

if (Test-DevServerReachable) {
  Write-Host "Dev server is already reachable at http://127.0.0.1:5173"
  exit 0
}

Write-Host "Starting dev server at http://127.0.0.1:5173 ..."
Write-Host "Close this window to stop the Vite dev server."

& $stableScript
exit $LASTEXITCODE
