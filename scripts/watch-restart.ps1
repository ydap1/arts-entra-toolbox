# Art's Entra Toolbox - File watcher auto-restart
# Usage: .\scripts\watch-restart.ps1
# Watches src/main/ and src/preload/ for changes and does a full dev restart
# (Renderer changes are handled by HMR; this covers main-process changes).

param(
    [switch]$NoTypeCheck,
    [int]$DebounceMs = 800
)

$ErrorActionPreference = "Stop"
$appName = "arts-entra-toolbox"
$watcherPaths = @("src/main", "src/preload")

$global:lastRun = 0
$global:proc = $null

function Stop-Toolbox {
    if ($global:proc -and -not $global:proc.HasExited) {
        Stop-Process -Id $global:proc.Id -Force -ErrorAction SilentlyContinue
        $global:proc = $null
        Start-Sleep -Milliseconds 300
    }
    # Also kill any orphaned electron/node processes
    Get-Process | Where-Object {
        $_.ProcessName -match "electron" -or
        ($_.ProcessName -eq "node" -and $_.CommandLine -match $appName)
    } | Stop-Process -Force -ErrorAction SilentlyContinue
}

function Start-Toolbox {
    Write-Host "`n>> Starting dev server...`n" -ForegroundColor Green
    if ($NoTypeCheck) {
        $global:proc = Start-Process -FilePath "npm" -ArgumentList "run","dev" `
            -WorkingDirectory (Get-Location) -PassThru -NoNewWindow
    } else {
        # Run typecheck inline before launching
        Write-Host "Running typecheck..." -ForegroundColor DarkGray
        npm run typecheck | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: TypeScript errors present. Launching anyway..." -ForegroundColor Yellow
        }
        $global:proc = Start-Process -FilePath "npm" -ArgumentList "run","dev" `
            -WorkingDirectory (Get-Location) -PassThru -NoNewWindow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Art's Entra Toolbox - Watch Restart" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Watching: $($watcherPaths -join ', ')" -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to exit.`n" -ForegroundColor DarkGray

# Create filesystem watchers
$watchers = @()
foreach ($path in $watcherPaths) {
    if (-not (Test-Path $path)) { continue }
    $w = New-Object System.IO.FileSystemWatcher
    $w.Path = Resolve-Path $path
    $w.IncludeSubdirectories = $true
    $w.Filter = "*.*"
    $w.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName

    $action = {
        $now = Get-Date
        $path = $Event.SourceEventArgs.FullPath
        # Ignore node_modules, out, and temp files
        if ($path -match '(\node_modules\|\.git\|out\|\.tmp|\~)') { return }

        $global:lastRun = $now
        Start-Sleep -Milliseconds $Event.MessageData
        # Check if this is still the latest change after debounce
        if ($global:lastRun -eq $now) {
            Write-Host "`n>> Change detected: $path" -ForegroundColor Cyan
            Stop-Toolbox
            Start-Toolbox
        }
    }

    $job = Register-ObjectEvent -InputObject $w -EventName "Changed" -Action $action -MessageData $DebounceMs
    $job2 = Register-ObjectEvent -InputObject $w -EventName "Created" -Action $action -MessageData $DebounceMs
    $job3 = Register-ObjectEvent -InputObject $w -EventName "Renamed" -Action $action -MessageData $DebounceMs
    $w.EnableRaisingEvents = $true
    $watchers += $w
}

# Initial start
Start-Toolbox

# Keep alive
try {
    while ($true) {
        if ($global:proc -and $global:proc.HasExited) {
            Write-Host "`nWARNING: Dev server exited. Restarting in 2s... (Ctrl+C to quit)" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
            Start-Toolbox
        }
        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host "`n>> Shutting down..." -ForegroundColor Red
    Stop-Toolbox
    foreach ($w in $watchers) {
        $w.EnableRaisingEvents = $false
        $w.Dispose()
    }
    Get-EventSubscriber | Where-Object { $_.SourceObject -is [System.IO.FileSystemWatcher] } | Unregister-Event
}
