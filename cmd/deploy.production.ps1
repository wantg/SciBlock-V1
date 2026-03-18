$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $root "docker/.env.production"
$composeFile = Join-Path $root "docker-compose.production.yml"

if (-not (Test-Path $envFile)) {
  throw "[deploy:prod] Missing $envFile"
}

$raw = Get-Content $envFile -Raw
if ($raw -match "CHANGE_ME") {
  throw "[deploy:prod] Found CHANGE_ME placeholder in $envFile"
}

Write-Host "[deploy:prod] Building and starting production stack..."
docker compose --env-file $envFile -f $composeFile up -d --build --remove-orphans

Write-Host "[deploy:prod] Stack is up."
docker compose --env-file $envFile -f $composeFile ps
