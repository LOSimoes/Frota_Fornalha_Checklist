param(
  [string]$Destination = 'C:\FORNALHA MINEIRA\LUCAS\APPs\Backup FFC\Fechamentos mensais',
  [string]$NodePath = 'C:\Program Files\nodejs\node.exe'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$script = Join-Path $PSScriptRoot 'monthly-report.cjs'
if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf)) { throw 'Node não encontrado.' }
if (-not [IO.Path]::IsPathRooted($Destination) -or $Destination.Contains('"')) { throw 'Informe um caminho absoluto válido.' }
$action = New-ScheduledTaskAction -Execute $NodePath -Argument ('"' + $script + '" "' + $Destination + '"') -WorkingDirectory $root
# Daily check also catches missed runs and late synchronized inspections.
$trigger = New-ScheduledTaskTrigger -Daily -At '01:00'
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15) -ExecutionTimeLimit (New-TimeSpan -Hours 4) -MultipleInstances IgnoreNew
$existing = Get-ScheduledTask -TaskName 'Fornalha-Fechamento' -ErrorAction SilentlyContinue
if ($existing -and $existing.State -eq 'Running') { throw 'Aguarde o fechamento em execução.' }
Register-ScheduledTask -TaskName 'Fornalha-Fechamento' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Arquiva PDFs mensais a partir do terceiro dia, preservando histórico.' -Force
