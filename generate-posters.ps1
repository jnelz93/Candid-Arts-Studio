<#
generate-posters.ps1
Generates poster JPGs for every .mp4 under the project using ffmpeg.
Creates a JPEG snapshot at 5 seconds into the video named the same as the video but with .jpg extension (same folder).

Usage:
  1) Install ffmpeg and ensure it's on PATH (https://ffmpeg.org/download.html)
  2) From project root run: .\generate-posters.ps1
  3) To auto-commit posters to git and push: .\generate-posters.ps1 -Commit

Options:
  -Commit: if provided, posters will be staged and committed (message: "chore: add video posters") and pushed to origin/main
  -TimeOffsetSeconds: second offset to capture the frame (default 5)
#>
param(
    [switch]$Commit,
    [int]$TimeOffsetSeconds = 5
)

function Fail($msg) { Write-Error $msg; exit 1 }

# Ensure ffmpeg available
$ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ff) { Fail 'ffmpeg not found on PATH. Install ffmpeg and re-run this script.' }

$root = Get-Location
$videoFiles = Get-ChildItem -Path $root -Recurse -Include *.mp4 -File
if (-not $videoFiles) { Write-Host 'No MP4 files found.'; exit 0 }

Write-Host "Found $($videoFiles.Count) video(s). Generating posters (offset = ${TimeOffsetSeconds}s)..."
$created = @()
foreach ($v in $videoFiles) {
    $outDir = $v.DirectoryName
    $base = [System.IO.Path]::GetFileNameWithoutExtension($v.Name)
    $outPath = Join-Path $outDir ($base + '.jpg')
    if (Test-Path $outPath) {
        Write-Host "Skipping existing poster: $outPath"
        continue
    }
    $in = $v.FullName
    Write-Host "Creating poster for: $($v.FullName) -> $outPath"
    $args = @('-ss', $TimeOffsetSeconds.ToString(), '-i', $in, '-vframes', '1', '-q:v', '2', '-y', $outPath)
    $proc = Start-Process -FilePath ffmpeg -ArgumentList $args -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -eq 0) {
        $created += $outPath
    } else {
        Write-Warning "ffmpeg failed for $($v.FullName) (exit $($proc.ExitCode))"
    }
}

Write-Host "Created $($created.Count) poster(s)."
if ($Commit -and $created.Count -gt 0) {
    git add $created
    git commit -m "chore: add video posters" || Write-Warning 'Commit returned non-zero status'
    git push origin main
}

Write-Host 'Done.'
