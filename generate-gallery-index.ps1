<#
generate-gallery-index.ps1

Scans top-level client folders in the project root and builds JSON manifests consumed by the client JS.
Outputs:
 - data/gallery-images.json
 - data/gallery-videos.json

Paths in JSON are relative web paths (forward slashes).
This script excludes known project/system folders and only indexes directories that contain media files.
#>

$root = $PSScriptRoot
$dataDir = Join-Path $root 'data'
if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

function ToWebPath($path) {
    $rel = $path.Substring($root.Length).TrimStart('\')
    return ($rel -replace '\\','/')
}

$imagesIndex = @{ clients = @{} }
$videosIndex = @{ clients = @{} }

# Exclude known non-client or system folders (configurable)
$excluded = @(
    'data','images','ffmpeg','UploadQueue','Videos','images','admin','content',
    '.git','node_modules','.github','.vscode','dist','build','assets','scripts','css','js'
)

# find top-level directories that are NOT in the exclusion list
$topDirs = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | Where-Object { $excluded -notcontains $_.Name }

# Filter to only directories that actually contain media files (images or videos)
$mediaDirs = @()
foreach ($d in $topDirs) {
    $mediaFiles = Get-ChildItem -Path $d.FullName -Recurse -File -Include *.jpg,*.jpeg,*.png,*.mp4,*.webm,*.mov,*.ogg -ErrorAction SilentlyContinue
    if ($mediaFiles.Count -gt 0) { $mediaDirs += $d }
}

foreach ($d in $mediaDirs) {
    $clientName = $d.Name
    # initialize client maps
    if (-not $imagesIndex.clients.ContainsKey($clientName)) { $imagesIndex.clients[$clientName] = @{} }
    if (-not $videosIndex.clients.ContainsKey($clientName)) { $videosIndex.clients[$clientName] = @{} }

    # discover subfolders (Photos, Prenup, SDE, Wedding, Reception, etc.)
    $subfolders = Get-ChildItem -Path $d.FullName -Directory -ErrorAction SilentlyContinue
    if ($subfolders.Count -eq 0) {
        # no subfolders, scan files in root
        $files = Get-ChildItem -Path $d.FullName -File -ErrorAction SilentlyContinue | Sort-Object Name
        foreach ($f in $files) {
            $ext = $f.Extension.ToLower()
            $web = ToWebPath($f.FullName)
            if ($ext -in '.jpg','.jpeg','.png') {
                if (-not $imagesIndex.clients[$clientName].ContainsKey('_root')) { $imagesIndex.clients[$clientName]['_root'] = @() }
                if ($imagesIndex.clients[$clientName]['_root'] -notcontains $web) { $imagesIndex.clients[$clientName]['_root'] += $web }
            } elseif ($ext -in '.mp4','.webm','.mov','.ogg') {
                if (-not $videosIndex.clients[$clientName].ContainsKey('_root')) { $videosIndex.clients[$clientName]['_root'] = @() }
                if ($videosIndex.clients[$clientName]['_root'] -notcontains $web) { $videosIndex.clients[$clientName]['_root'] += $web }
            }
        }
    } else {
        foreach ($s in $subfolders) {
            $files = Get-ChildItem -Path $s.FullName -File -ErrorAction SilentlyContinue | Sort-Object Name
            foreach ($f in $files) {
                $ext = $f.Extension.ToLower()
                $web = ToWebPath($f.FullName)
                if ($ext -in '.jpg','.jpeg','.png') {
                    if (-not $imagesIndex.clients[$clientName].ContainsKey($s.Name)) { $imagesIndex.clients[$clientName][$s.Name] = @() }
                    if ($imagesIndex.clients[$clientName][$s.Name] -notcontains $web) { $imagesIndex.clients[$clientName][$s.Name] += $web }
                } elseif ($ext -in '.mp4','.webm','.mov','.ogg') {
                    if (-not $videosIndex.clients[$clientName].ContainsKey($s.Name)) { $videosIndex.clients[$clientName][$s.Name] = @() }
                    if ($videosIndex.clients[$clientName][$s.Name] -notcontains $web) { $videosIndex.clients[$clientName][$s.Name] += $web }
                }
            }
        }
    }

    # pick a thumbnail: first image under client
    $firstImage = Get-ChildItem -Path $d.FullName -Recurse -File | Where-Object { $_.Extension -match 'jpg|jpeg|png' } | Select-Object -First 1
    if ($firstImage) { $imagesIndex.clients[$clientName]['_thumb'] = ToWebPath($firstImage.FullName) }
    # pick a thumbnail for videos as well (same fallback)
    if ($firstImage) { $videosIndex.clients[$clientName]['_thumb'] = ToWebPath($firstImage.FullName) }
}

# Deduplicate any arrays (defensive) — ensure each listed file appears only once
foreach ($client in $imagesIndex.clients.Keys) {
    $sections = @($imagesIndex.clients[$client].Keys)
    foreach ($section in $sections) {
        $val = $imagesIndex.clients[$client][$section]
        if ($val -is [System.Array]) {
            $unique = $val | Select-Object -Unique
            $imagesIndex.clients[$client][$section] = $unique
        }
    }
}
foreach ($client in $videosIndex.clients.Keys) {
    $sections = @($videosIndex.clients[$client].Keys)
    foreach ($section in $sections) {
        $val = $videosIndex.clients[$client][$section]
        if ($val -is [System.Array]) {
            $unique = $val | Select-Object -Unique
            $videosIndex.clients[$client][$section] = $unique
        }
    }
}

$imagesJson = $imagesIndex | ConvertTo-Json -Depth 10
$videosJson = $videosIndex | ConvertTo-Json -Depth 10

Set-Content -Path (Join-Path $dataDir 'gallery-images.json') -Value $imagesJson -Encoding UTF8
Set-Content -Path (Join-Path $dataDir 'gallery-videos.json') -Value $videosJson -Encoding UTF8

Write-Host "Generated data/gallery-images.json and data/gallery-videos.json"
