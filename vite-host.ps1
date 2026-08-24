$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundledNode = Join-Path (Split-Path $root -Parent) "node-v20.19.1-win-x64\node.exe"
$viteEntry = Join-Path $root "node_modules\vite\bin\vite.js"

Set-Location $root

if (-not (Test-Path $bundledNode)) {
  throw "Missing bundled node executable at $bundledNode"
}

if (-not (Test-Path $viteEntry)) {
  throw "Missing Vite entry script at $viteEntry"
}

$env:CI = "1"
& $bundledNode $viteEntry --host 127.0.0.1 --port 6173 --strictPort
