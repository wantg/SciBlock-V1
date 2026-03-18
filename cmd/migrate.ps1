$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $root "docker/.env.production"
$composeFile = Join-Path $root "docker-compose.production.yml"

if (-not (Test-Path $envFile)) {
  throw "[migrate] Missing $envFile"
}

Write-Host "[migrate] Running Drizzle migrations in backend container..."
docker compose --env-file $envFile -f $composeFile run --rm backend pnpm --filter @workspace/db run migrate
Write-Host "[migrate] Done."
