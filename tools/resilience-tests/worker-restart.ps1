param(
  [string]$NamePattern = 'cogtics-worker'
)

$workers = docker ps --format "{{.Names}}" | Where-Object { $_ -match $NamePattern }

if (-not $workers) {
  Write-Host "No containers found matching pattern: $NamePattern"
  exit 1
}

Write-Host "Restarting worker containers:"
$workers | ForEach-Object { Write-Host " - $_" }

$workers | ForEach-Object { docker restart $_ | Out-Null }

Write-Host "Restart complete."
Write-Host "Health checks: http://localhost:3011/health, 3012/health, 3013/health"
