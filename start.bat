@echo off
cd /d "%~dp0"
if not exist "vendor\zca-js\node_modules\crypto-js\package.json" node scripts\setup.mjs
if errorlevel 1 goto failed
if not exist "vendor\ffmpeg.exe" if not defined FFMPEG_PATH node scripts\setup.mjs
if errorlevel 1 goto failed
start "" http://127.0.0.1:4317
node server.mjs
:failed
pause
