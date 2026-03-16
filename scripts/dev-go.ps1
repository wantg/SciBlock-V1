#requires -Version 5.1
[CmdletBinding()]
param(
  [switch]$AutoMigrate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $rootDir '.env'

function Import-DotEnv {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) {
      return
    }

    $pair = $line -split '=', 2
    if ($pair.Count -ne 2) {
      return
    }

    $name = $pair[0].Trim()
    $value = $pair[1].Trim()
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

Import-DotEnv -Path $envFile

if (-not $env:PORT -or [string]::IsNullOrWhiteSpace($env:PORT)) {
  if ($env:GO_PORT -and -not [string]::IsNullOrWhiteSpace($env:GO_PORT)) {
    $env:PORT = $env:GO_PORT
  } else {
    $env:PORT = '8082'
  }
}

if ($AutoMigrate) {
  $env:AUTO_MIGRATE = 'true'
}

Write-Host "[go-api] root: $rootDir"
Write-Host "[go-api] port: $($env:PORT)"
Write-Host "[go-api] auto_migrate: $($env:AUTO_MIGRATE)"

Push-Location (Join-Path $rootDir 'artifacts/go-api')
try {
  go run ./cmd/server/main.go
}
finally {
  Pop-Location
}
