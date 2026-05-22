$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root "vite.dev.pid"
 $stdoutLog = Join-Path $root "vite.out.log"
 $stderrLog = Join-Path $root "vite.err.log"
 $runnerScript = Join-Path $root "vite-runner.ps1"
Set-Location $root

try {
  $httpStatus = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5173" -TimeoutSec 3 | Select-Object -ExpandProperty StatusCode
  if ($httpStatus -eq 200) {
    Write-Host "Dev server is already reachable at http://127.0.0.1:5173"
    exit 0
  }
} catch {
}

if (Test-Path $pidFile) {
  $existingPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($existingPid) {
    $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($existingProcess) {
      Write-Host "Dev server launcher is already running. PID: $existingPid"
      exit 0
    }
  }
  Remove-Item $pidFile -ErrorAction SilentlyContinue
}

if (Test-Path $stdoutLog) {
  Clear-Content $stdoutLog -ErrorAction SilentlyContinue
}

if (Test-Path $stderrLog) {
  Clear-Content $stderrLog -ErrorAction SilentlyContinue
}

$startCommand = "start """" /min ""$root\start-vite-stable.cmd"""
$launcher = Start-Process -FilePath "cmd.exe" `
  -ArgumentList @("/c", $startCommand) `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $pidFile -Value $launcher.Id

function Test-DevServerReachable {
  try {
    $statusCode = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5173" -TimeoutSec 3 | Select-Object -ExpandProperty StatusCode
    return ($statusCode -eq 200)
  } catch {
    return $false
  }
}

$isReachable = $false
foreach ($delay in @(2, 3, 5)) {
  Start-Sleep -Seconds $delay
  if (Test-DevServerReachable) {
    $isReachable = $true
    break
  }
}

if (-not $isReachable) {
  if (Get-Process -Id $launcher.Id -ErrorAction SilentlyContinue) {
    Stop-Process -Id $launcher.Id -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $pidFile -ErrorAction SilentlyContinue
  throw "Dev server did not become reachable on http://127.0.0.1:5173"
}

Start-Sleep -Seconds 3
if (-not (Test-DevServerReachable)) {
  Remove-Item $pidFile -ErrorAction SilentlyContinue
  throw "Dev server started but did not stay reachable on http://127.0.0.1:5173"
}

Write-Host "Dev server monitor started and verified at http://127.0.0.1:5173 (PID: $($launcher.Id))"
