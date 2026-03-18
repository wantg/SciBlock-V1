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

Write-Host "[deploy:stop] Stopping $Mode stack..."
docker compose --env-file $envFile -f $composeFile down --remove-orphans
Write-Host "[deploy:stop] Done."
