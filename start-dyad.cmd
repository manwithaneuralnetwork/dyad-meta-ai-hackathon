@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -Command "$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if (-not $listener) { Start-Process -WindowStyle Hidden -FilePath 'npm.cmd' -ArgumentList @('run','dev') -WorkingDirectory '%~dp0' -RedirectStandardOutput '%~dp0dev-server.log' -RedirectStandardError '%~dp0dev-server.err.log' }"

timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:3000"
endlocal
