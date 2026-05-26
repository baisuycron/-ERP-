$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$bundledNode = Join-Path (Split-Path $root -Parent) "node-v20.19.1-win-x64\node.exe"
$viteEntry = Join-Path $root "node_modules\vite\bin\vite.js"

if (-not (Test-Path $viteEntry)) {
  throw "Missing Vite entry script at $viteEntry"
}

if (Test-Path $bundledNode) {
  & $bundledNode $viteEntry --host 127.0.0.1 --port 5173 --strictPort
  exit $LASTEXITCODE
}

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
& $nodePath $viteEntry --host 127.0.0.1 --port 5173 --strictPort
