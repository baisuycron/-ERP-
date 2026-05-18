$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root "vite.dev.pid"
$stdoutLog = Join-Path $root "vite.out.log"
$stderrLog = Join-Path $root "vite.err.log"

$launcherPid = ""
$launcherRunning = $false
if (Test-Path $pidFile) {
  $launcherPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($launcherPid) {
    $launcherRunning = [bool](Get-Process -Id $launcherPid -ErrorAction SilentlyContinue)
    if (-not $launcherRunning) {
      $launcherPid = ""
      Remove-Item $pidFile -ErrorAction SilentlyContinue
    }
  }
}

$httpStatus = ""
try {
  $httpStatus = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5173" -TimeoutSec 3 | Select-Object -ExpandProperty StatusCode
} catch {
  $httpStatus = "DOWN"
}

[pscustomobject]@{
  launcherPid = if ($launcherPid) { $launcherPid } else { "-" }
  launcherRunning = $launcherRunning
  httpStatus = $httpStatus
  stdoutLog = if (Test-Path $stdoutLog) { $stdoutLog } else { "-" }
  stderrLog = if (Test-Path $stderrLog) { $stderrLog } else { "-" }
}
