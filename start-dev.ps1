$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root "vite.dev.pid"
$stdoutLog = Join-Path $root "vite.out.log"
$stderrLog = Join-Path $root "vite.err.log"
$bundledNode = Join-Path (Split-Path $root -Parent) "node-v20.19.1-win-x64\node.exe"
$codexNode = "C:\Users\Thunderobot\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$programmaticEntry = Join-Path $root "start-vite-programmatic.mjs"
Set-Location $root

if (-not (Test-Path $programmaticEntry)) {
  throw "Missing programmatic Vite entry at $programmaticEntry"
}

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

$nodePath = if (Test-Path $bundledNode) {
  $bundledNode
} elseif (Test-Path $codexNode) {
  $codexNode
} else {
  (Get-Command node.exe -ErrorAction Stop).Source
}

# Work around the Windows environment collision between Path and PATH.
Remove-Item Env:PATH -ErrorAction SilentlyContinue

$launcher = Start-Process -FilePath $nodePath `
  -ArgumentList @($programmaticEntry) `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
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
