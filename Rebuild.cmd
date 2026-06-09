@echo off
cd /d "%~dp0"
npm run build
if errorlevel 1 ( echo Build failed & pause & exit /b 1 )
npm run start
if errorlevel 1 pause
