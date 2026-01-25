@echo off

set "ROOT=C:\Users\Victor Daniel\.gemini\antigravity\scratch\booking-app"

echo Starting backend...
start "Backend" cmd /k "cd /d "%ROOT%" && node server\index.js"

echo Starting frontend...
start "Frontend" cmd /k "cd /d "%ROOT%" && npm run dev"

REM Open the app in browser
start "" "http://localhost:5174/"