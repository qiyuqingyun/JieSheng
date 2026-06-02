$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\prepare-ai-worker.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "AI worker preparation failed."
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\build-frontend.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Frontend build failed."
}

