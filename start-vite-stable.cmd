@echo off
cd /d "%~dp0"
set "BUNDLED_NODE=%~dp0..\node-v20.19.1-win-x64\node.exe"
set "CODEX_NODE=C:\Users\Thunderobot\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "VITE_ENTRY=%~dp0node_modules\vite\bin\vite.js"
if exist "%BUNDLED_NODE%" (
  "%BUNDLED_NODE%" "%VITE_ENTRY%" --host 127.0.0.1 --port 5173 --strictPort
) else if exist "%CODEX_NODE%" (
  "%CODEX_NODE%" "%VITE_ENTRY%" --host 127.0.0.1 --port 5173 --strictPort
) else (
  node "%VITE_ENTRY%" --host 127.0.0.1 --port 5173 --strictPort
)
pause
