param(
  [string]$PythonVersion = "3.13",
  [string]$Destination = "target/ai-worker-resources"
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$AiWorkerDir = Join-Path $Root "ai-worker"
$AiWorkerSrc = Join-Path $AiWorkerDir "src\jiesheng_ai_worker"
$ResourcesDir = Join-Path $Root $Destination
$PythonResourceDir = Join-Path $ResourcesDir "python"
$AiWorkerResourceDir = Join-Path $ResourcesDir "ai_worker"
$SitePackagesDir = Join-Path $PythonResourceDir "site-packages"
$RequirementsPath = Join-Path $AiWorkerDir "requirements.packaging.txt"
$env:UV_CACHE_DIR = Join-Path $Root ".uv-cache"
$env:UV_PYTHON_INSTALL_DIR = Join-Path $Root ".uv-python"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [string]$WorkingDirectory = $Root
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($Arguments -join ' ')"
  }
}

function Copy-CleanDirectory {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Source,
    [Parameter(Mandatory = $true)]
    [string]$Target
  )

  if (Test-Path $Target) {
    Remove-Item -LiteralPath $Target -Recurse -Force
  }
  New-Item -ItemType Directory -Force $Target | Out-Null
  Get-ChildItem -LiteralPath $Source -Force |
    Copy-Item -Destination $Target -Recurse -Force
}

Write-Host "Preparing JieSheng AI worker resources with uv..."
Write-Host "Root: $Root"

Push-Location $AiWorkerDir
try {
  Invoke-Checked -FilePath "uv" -Arguments @(
    "venv",
    ".venv",
    "--python", $PythonVersion,
    "--managed-python",
    "--seed",
    "--relocatable",
    "--allow-existing"
  ) -WorkingDirectory $AiWorkerDir
  Invoke-Checked -FilePath "uv" -Arguments @(
    "sync",
    "--python", ".venv\Scripts\python.exe",
    "--no-install-project"
  ) -WorkingDirectory $AiWorkerDir
}
finally {
  Pop-Location
}

$VenvPython = Join-Path $AiWorkerDir ".venv\Scripts\python.exe"
$PythonInfoOutput = & $VenvPython -c "import json,sys; print(json.dumps({'executable': sys.executable, 'prefix': sys.prefix, 'base_prefix': sys.base_prefix}))"
if ($LASTEXITCODE -ne 0) {
  throw "Unable to query uv venv Python at '$VenvPython'."
}

$PythonInfoJson = $PythonInfoOutput |
  Where-Object { $_.Trim().StartsWith("{") } |
  Select-Object -Last 1

if (-not $PythonInfoJson) {
  throw "Unable to parse Python env information from conda output."
}

$PythonInfo = $PythonInfoJson | ConvertFrom-Json
$PythonExe = [string]$PythonInfo.executable
$VenvPrefix = [string]$PythonInfo.prefix
$PythonPrefix = [string]$PythonInfo.base_prefix

if (-not (Test-Path $PythonExe)) {
  throw "Python executable not found: $PythonExe"
}

if (-not (Test-Path $AiWorkerSrc)) {
  throw "AI worker source not found: $AiWorkerSrc"
}

New-Item -ItemType Directory -Force $ResourcesDir | Out-Null

Write-Host "Copying AI worker source..."
if (Test-Path $AiWorkerResourceDir) {
  Remove-Item -LiteralPath $AiWorkerResourceDir -Recurse -Force
}
New-Item -ItemType Directory -Force $AiWorkerResourceDir | Out-Null
Copy-Item -LiteralPath $AiWorkerSrc -Destination $AiWorkerResourceDir -Recurse -Force

Write-Host "Copying uv-managed Python runtime from $PythonPrefix ..."
if (Test-Path $PythonResourceDir) {
  Remove-Item -LiteralPath $PythonResourceDir -Recurse -Force
}
New-Item -ItemType Directory -Force $PythonResourceDir | Out-Null

Copy-Item -LiteralPath (Join-Path $PythonPrefix "python.exe") -Destination (Join-Path $PythonResourceDir "python.exe") -Force
Copy-Item -LiteralPath (Join-Path $PythonPrefix "pythonw.exe") -Destination (Join-Path $PythonResourceDir "pythonw.exe") -Force -ErrorAction SilentlyContinue

Get-ChildItem -LiteralPath $PythonPrefix -Filter "python*.dll" -File -ErrorAction SilentlyContinue |
  Copy-Item -Destination $PythonResourceDir -Force

Get-ChildItem -LiteralPath $PythonPrefix -Filter "*.dll" -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match "^(vcruntime|msvcp|ucrtbase|api-ms-win)" } |
  Copy-Item -Destination $PythonResourceDir -Force

$RuntimeDirs = @("DLLs", "Lib")
foreach ($RuntimeDir in $RuntimeDirs) {
  $SourceDir = Join-Path $PythonPrefix $RuntimeDir
  if (Test-Path $SourceDir) {
    Copy-CleanDirectory -Source $SourceDir -Target (Join-Path $PythonResourceDir $RuntimeDir)
  }
}

Write-Host "Resolving Python dependencies with uv..."
Push-Location $AiWorkerDir
try {
  Invoke-Checked -FilePath "uv" -Arguments @("lock") -WorkingDirectory $AiWorkerDir
  Invoke-Checked -FilePath "uv" -Arguments @(
    "export",
    "--format", "requirements.txt",
    "--no-dev",
    "--no-hashes",
    "-o", $RequirementsPath
  ) -WorkingDirectory $AiWorkerDir
}
finally {
  Pop-Location
}

New-Item -ItemType Directory -Force $SitePackagesDir | Out-Null

$VenvSitePackages = Get-ChildItem -LiteralPath (Join-Path $VenvPrefix "Lib\site-packages") -ErrorAction SilentlyContinue
if ($VenvSitePackages) {
  Write-Host "Copying uv venv site-packages..."
  $VenvSitePackages |
    Where-Object { $_.Name -notin @("pip", "pip-26.1.2.dist-info", "__pycache__") } |
    Copy-Item -Destination $SitePackagesDir -Recurse -Force
}
else {
  Write-Host "No uv venv site-packages found."
}

Write-Host "AI worker resources prepared:"
Write-Host "  $AiWorkerResourceDir"
Write-Host "  $PythonResourceDir"
