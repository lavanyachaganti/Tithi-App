@echo off
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0"
start "Backend" cmd /k "cd /d "%BACKEND_DIR%" && npm start"
cd /d "%FRONTEND_DIR%" && npm run dev -- --host 127.0.0.1
