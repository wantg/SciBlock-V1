$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $root "docker/.env.dev"
$composeFile = Join-Path $root "docker-compose.yml"
$templateFile = Join-Path $root "docker/.env.example"

if (-not (Test-Path $envFile)) {
  Copy-Item $templateFile $envFile
  Write-Host "[deploy:dev] Created $envFile from template."
}

Write-Host "[deploy:dev] Building and starting local stack..."
docker compose --env-file $envFile -f $composeFile up -d --build --remove-orphans

Write-Host "[deploy:dev] Stack is up."
docker compose --env-file $envFile -f $composeFile ps

$frontendPort = (Get-Content $envFile | Where-Object { $_ -match '^FRONTEND_PORT=' } | Select-Object -First 1).Split('=')[1]
$backendPort = (Get-Content $envFile | Where-Object { $_ -match '^BACKEND_PORT=' } | Select-Object -First 1).Split('=')[1]

Write-Host "[deploy:dev] Frontend: http://localhost:$frontendPort"
Write-Host "[deploy:dev] Backend : http://localhost:$backendPort/api/healthz"
