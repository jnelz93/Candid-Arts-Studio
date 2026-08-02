<#
watch-commit.ps1
Watches the repository for file changes, debounces 30s of inactivity, then stages and commits locally with message "auto: <timestamp>".
Run: .\watch-commit.ps1
Stop: Ctrl+C
This script DOES NOT push. Use publish.ps1 to push commits to origin.
#>
param(
    [int]$DebounceSeconds = 30
)
$root = Get-Location
$exclude = @('.git', 'node_modules', 'preview.ps1', 'publish.ps1', 'watch-commit.ps1')
function ShouldIgnore($fullpath) {
    foreach ($e in $exclude) {
        if ($fullpath -like "*\$e*") { return $true }
    }
    return $false
}

$timer = $null
$pending = $false
$readyToCommit = $false
$pendingMessage = $null

$fsw = New-Object System.IO.FileSystemWatcher $root.Path, '*'
$fsw.IncludeSubdirectories = $true
$fsw.EnableRaisingEvents = $true

$action = {
    param($src,$e)
    try {
        $full = $e.FullPath
        if (ShouldIgnore $full) { return }
        Write-Host "Change detected: $($e.ChangeType) $full"
        $script:pending = $true
        if ($script:timer) { $script:timer.Stop(); $script:timer.Dispose(); $script:timer = $null }
        $script:timer = New-Object System.Timers.Timer ($DebounceSeconds * 1000)
        $script:timer.AutoReset = $false
        $script:timer.add_elapsed({
            # Mark ready for approval; main loop will prompt interactively
            if (-not (git rev-parse --is-inside-work-tree 2>$null)) { Write-Host "Not a git repo. Skipping auto-commit."; return }
            if (-not (git status --porcelain)) { Write-Host "No changes to commit."; return }
            $ts = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
            $script:pendingMessage = "auto: $ts"
            $script:readyToCommit = $true
            Write-Host "`nChanges are ready for commit with message: $($script:pendingMessage)"
            Write-Host "Switch to this console to review and approve when convenient. Running 'publish.ps1' will push commits; or approve here to commit now."
            $script:pending = $false
            $script:timer.Dispose(); $script:timer = $null
        })
        $script:timer.Start()
    } catch {
        Write-Warning "Watcher error: $_"
    }
}

# Register events with explicit identifiers so they can be unregistered
Register-ObjectEvent -InputObject $fsw -EventName Changed -SourceIdentifier FSW_Changed -Action $action | Out-Null
Register-ObjectEvent -InputObject $fsw -EventName Created -SourceIdentifier FSW_Created -Action $action | Out-Null
Register-ObjectEvent -InputObject $fsw -EventName Deleted -SourceIdentifier FSW_Deleted -Action $action | Out-Null
Register-ObjectEvent -InputObject $fsw -EventName Renamed -SourceIdentifier FSW_Renamed -Action $action | Out-Null

Write-Host "Watching $($root.Path) (debounce = $DebounceSeconds s). Press Ctrl+C to stop."
try {
    while ($true) {
        if ($readyToCommit) {
            Write-Host "`nAuto-commit pending with message: $pendingMessage"
            git --no-pager status -s
            Write-Host "Show unstaged diff (d), show staged diff (s), approve commit (y), or skip (n)?"
            $resp = Read-Host "Choice (d/s/y/n)"
            if ($resp -eq 'd') {
                git --no-pager diff
                Write-Host "Approve commit now? (y/n)"
                $resp2 = Read-Host
                if ($resp2 -eq 'y') { $resp = 'y' } else { $resp = 'n' }
            } elseif ($resp -eq 's') {
                git --no-pager diff --staged
                Write-Host "Approve commit now? (y/n)"
                $resp2 = Read-Host
                if ($resp2 -eq 'y') { $resp = 'y' } else { $resp = 'n' }
            }

            if ($resp -eq 'y') {
                git add -A
                git commit -m $pendingMessage
                if ($LASTEXITCODE -eq 0) { Write-Host "Committed: $pendingMessage" } else { Write-Host "Commit failed with exit code $LASTEXITCODE" }
            } else {
                Write-Host "Skipped auto-commit. You can run publish.ps1 to commit manually later."
            }
            $readyToCommit = $false
            $pendingMessage = $null
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Unregister-Event -SourceIdentifier FSW_Changed -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier FSW_Created -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier FSW_Deleted -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier FSW_Renamed -ErrorAction SilentlyContinue
    $fsw.EnableRaisingEvents = $false
    $fsw.Dispose()
    Write-Host "Watcher stopped."
}
