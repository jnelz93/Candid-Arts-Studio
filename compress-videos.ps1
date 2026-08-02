<#
compress-videos.ps1

Scans UploadQueue for video files, compresses them into Videos/ preserving client/subfolder layout,
and generates poster images. Uses .\ffmpeg\bin\ffmpeg.exe included in the project (or on PATH).

Usage: .\compress-videos.ps1 [-RunIndex]
 -RunIndex : After compressing, runs generate-gallery-index.ps1 to update data/*.json
#>
param(
    [switch]$RunIndex
)

$ff = Join-Path $PSScriptRoot 'ffmpeg\bin\ffmpeg.exe'
if (!(Test-Path $ff)) {
    Write-Error "ffmpeg not found at $ff. Make sure ffmpeg is present or install and adjust path."
    exit 1
}

$queue = Join-Path $PSScriptRoot 'UploadQueue'
$videosOut = Join-Path $PSScriptRoot 'Videos'

$exts = @('mp4','mov','mkv','avi')
$files = Get-ChildItem -Path $queue -Recurse -File | Where-Object { $exts -contains $_.Extension.TrimStart('.').ToLower() }
if ($files.Count -eq 0) { Write-Host "No video files found in UploadQueue."; exit 0 }

$total = $files.Count; $i = 0
foreach ($f in $files) {
    $i++
    $relative = $f.FullName.Substring($queue.Length).TrimStart('\')
    $destPath = Join-Path $videosOut $relative
    $destDir = Split-Path $destPath -Parent
    if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

    # Ensure output filename has .mp4 extension
    $outFile = [System.IO.Path]::ChangeExtension($destPath, '.mp4')

    Write-Progress -Activity "Compressing videos" -Status "$($f.Name) ($i of $total)" -PercentComplete (($i / $total) * 100)

    $args = @('-y','-i',"$($f.FullName)",'-c:v','libx264','-preset','medium','-crf','28','-c:a','aac','-b:a','128k',"$outFile")
    & "$ff" @args

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Compressed: $outFile"
        # generate poster (5s into video)
        $poster = [System.IO.Path]::ChangeExtension($outFile, '.jpg')
        $posterArgs = @('-y','-ss','00:00:05','-i',"$outFile",'-vframes','1',"$poster")
        & "$ff" @posterArgs
        if ($LASTEXITCODE -eq 0) { Write-Host "Poster created: $poster" } else { Write-Warning "Poster generation failed for $outFile" }
    } else {
        Write-Warning "Failed to compress: $($f.FullName)"
    }
}

Write-Host "Compression run complete. $i files processed."
if ($RunIndex) {
    $indexScript = Join-Path $PSScriptRoot 'generate-gallery-index.ps1'
    if (Test-Path $indexScript) {
        Write-Host "Running gallery index generation..."
        & "$indexScript"
    } else {
        Write-Warning "generate-gallery-index.ps1 not found. Skipping index generation."
    }
}
