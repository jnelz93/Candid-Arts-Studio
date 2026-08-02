<#
Interactive commit+push script.
Shows status and staged diff, prompts for commit message, then pushes to origin (current branch).
Usage: .\publish.ps1
#>
Write-Host "Checking git status..."
$porcelain = git status --porcelain
if (-not $porcelain) {
    Write-Host "No changes to commit."
    exit 0
}
Write-Host "`nGit status:"
git --no-pager status -s
Write-Host "`nShow full diff of unstaged changes? (y/n)"
$show = Read-Host
if ($show -eq 'y') { git --no-pager diff }
Write-Host "`nStage all changes and show staged diff? (y/n)"
$stage = Read-Host
if ($stage -eq 'y') { git add -A; git --no-pager diff --staged }
Write-Host "`nEnter commit message (leave empty to cancel):"
$msg = Read-Host
if (-not $msg) { Write-Host "Canceled."; exit 0 }
# Stage and commit
git add -A
git commit -m "$msg"
if ($LASTEXITCODE -ne 0) { Write-Host "Commit failed. Aborting push."; exit 1 }
# Determine current branch
$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) { $branch = 'main' }
Write-Host "Pushing to origin/$branch..."
git push -u origin $branch
