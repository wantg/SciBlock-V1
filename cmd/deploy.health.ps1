param(
  [ValidateSet("dev", "prod")]
  [string]$Mode = "dev"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

if ($Mode -eq "dev") {
  $envFile = Join-Path $root "docker/.env.dev"
  $composeFile = Join-Path $root "docker-compose.yml"
} else {
  $envFile = Join-Path $root "docker/.env.production"
  $composeFile = Join-Path $root "docker-compose.production.yml"
}

$envData = Get-Content $envFile
$frontendPort = ($envData | Where-Object { $_ -match '^FRONTEND_PORT=' } | Select-Object -First 1).Split('=')[1]
$backendPort = ($envData | Where-Object { $_ -match '^BACKEND_PORT=' } | Select-Object -First 1).Split('=')[1]

Write-Host "[health] compose status"
docker compose --env-file $envFile -f $composeFile ps

Write-Host "[health] backend /api/healthz"
Invoke-RestMethod -Uri "http://127.0.0.1:$backendPort/api/healthz" -Method Get | Out-Host

Write-Host "[health] frontend /"
(Invoke-WebRequest -Uri "http://127.0.0.1:$frontendPort/" -Method Head).StatusCode | Out-Host

Write-Host "[health] done"
