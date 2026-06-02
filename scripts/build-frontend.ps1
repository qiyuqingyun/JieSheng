$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$FrontendDir = Join-Path $Root "frontend"

Push-Location $FrontendDir
try {
  yarn build
  if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed."
  }
}
finally {
  Pop-Location
}

