param([string]$NodePath = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $NodePath) { $NodePath = (Get-Command node -ErrorAction Stop).Source }
$dataDirectory = Join-Path $projectRoot 'data'
$configFile = Join-Path $projectRoot 'runtime.json'
if (Test-Path -LiteralPath $configFile) {
  $runtime = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
  if ($runtime.dataDir) { $dataDirectory = $runtime.dataDir }
}
if ($env:FROTA_DATA_DIR) { $dataDirectory = $env:FROTA_DATA_DIR }
if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory 'admin.json'))) {
  throw 'Crie a senha primeiro, executando node server.cjs manualmente. Depois ative a tarefa automática.'
}
$logDirectory = Join-Path $projectRoot 'logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$logFile = Join-Path $logDirectory ('server-' + (Get-Date -Format 'yyyy-MM-dd') + '.log')
Set-Location -LiteralPath $projectRoot
& $NodePath (Join-Path $projectRoot 'server.cjs') *>> $logFile
exit $LASTEXITCODE
