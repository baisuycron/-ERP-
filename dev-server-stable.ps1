$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

& "D:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1
