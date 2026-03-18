param(
  [ValidateSet("dev", "prod")]
  [string]$Mode = "dev",
  [string]$Service = ""
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

if ([string]::IsNullOrWhiteSpace($Service)) {
  docker compose --env-file $envFile -f $composeFile logs -f --tail=200
} else {
  docker compose --env-file $envFile -f $composeFile logs -f --tail=200 $Service
}
