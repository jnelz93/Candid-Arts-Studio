<#
Local preview script.
Requires Node.js. Serves current folder on http://localhost:5000 using npx serve.
Usage: .\preview.ps1
#>
param(
    [int]$Port = 5000
)
Write-Host "Serving $(Get-Location) at http://localhost:$Port"
# Use npx to avoid global install; --yes to skip prompts
npx --yes serve -l $Port .
