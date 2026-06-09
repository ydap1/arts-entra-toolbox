# Art's Entra Toolbox - Clean rebuild + run
# Usage: .\scripts\rebuild.ps1
# Use this when HMR gets stuck or you want a fresh production-like run.

$ErrorActionPreference = "Stop"
$appName = "arts-entra-toolbox"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Art's Entra Toolbox - Clean Rebuild" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Kill any running instances
Write-Host "[1/4] Stopping any running Electron/Node processes..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object {
    $_.ProcessName -match "electron" -or
    ($_.ProcessName -eq "node" -and $_.CommandLine -match $appName)
}
if ($processes) {
    $processes | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "      >> Killed $($processes.Count) orphan process(es)." -ForegroundColor Green
} else {
    Write-Host "      >> No orphan processes found." -ForegroundColor DarkGray
}

# 2. Clean output directory
Write-Host "`n[2/4] Cleaning out/ directory..." -ForegroundColor Yellow
if (Test-Path "out") {
    Remove-Item -Recurse -Force "out"
    Write-Host "      >> out/ removed." -ForegroundColor Green
} else {
    Write-Host "      >> out/ did not exist." -ForegroundColor DarkGray
}

# 3. Full TypeScript check
Write-Host "`n[3/4] Running TypeScript check..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: TypeScript errors found. Aborting. Fix them and retry." -ForegroundColor Red
    exit 1
}
Write-Host "      >> Type check passed." -ForegroundColor Green

# 4. Build production bundle + preview
Write-Host "`n[4/4] Building and starting preview...`n" -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Build failed." -ForegroundColor Red
    exit 1
}

Write-Host "`nOK: Build successful. Starting preview...`n" -ForegroundColor Green
npm run start
