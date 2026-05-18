$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$npmPath = (Get-Command npm.cmd).Source
$attempt = 0
$hostArg = "127.0.0.1"

while ($true) {
  $attempt += 1
  Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting Vite monitor attempt $attempt"
  & $npmPath run dev -- --host $hostArg
  $exitCode = $LASTEXITCODE
  Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Vite exited with code $exitCode"
  Start-Sleep -Seconds 2
}
