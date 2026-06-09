# Art's Entra Toolbox - Dev launcher with process cleanup
# Usage: .\scripts\dev.ps1

$ErrorActionPreference = "Stop"
$appName = "arts-entra-toolbox"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Art's Entra Toolbox - Dev Mode" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Kill any lingering Electron / Node processes for this project
Write-Host "[1/3] Stopping any running Electron/Node processes..." -ForegroundColor Yellow
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

# 2. Type-check before launching (fast feedback on TS errors)
Write-Host "`n[2/3] Running TypeScript check..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nWARNING: TypeScript errors detected. Launching anyway in 2s..." -ForegroundColor Red
    Start-Sleep -Seconds 2
} else {
    Write-Host "      >> Type check passed." -ForegroundColor Green
}

# 3. Launch electron-vite dev (HMR for both main and renderer)
Write-Host "`n[3/3] Starting electron-vite dev server...`n" -ForegroundColor Yellow
npm run dev
