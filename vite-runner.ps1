$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$bundledNodeDir = Join-Path (Split-Path $root -Parent) "node-v20.19.1-win-x64"
$bundledNode = Join-Path $bundledNodeDir "node.exe"
$viteEntry = Join-Path $root "node_modules\vite\bin\vite.js"

if (-not (Test-Path $viteEntry)) {
  throw "Missing Vite entry script at $viteEntry"
}

if (Test-Path $bundledNode) {
  $env:PATH = "$bundledNodeDir;$env:PATH"
  $nodePath = $bundledNode
} else {
  $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
}
$attempt = 0
$hostArg = "127.0.0.1"
$portArg = "6173"

while ($true) {
  $attempt += 1
  Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting Vite monitor attempt $attempt"
  & $nodePath $viteEntry --host $hostArg --port $portArg --strictPort
  $exitCode = $LASTEXITCODE
  Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Vite exited with code $exitCode"
  Start-Sleep -Seconds 2
}
