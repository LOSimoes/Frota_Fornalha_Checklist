param(
  [string]$Destination = 'C:\FORNALHA MINEIRA\LUCAS\APPs\Backup FFC',
  [string]$NodePath = 'C:\Program Files\nodejs\node.exe'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$script = Join-Path $PSScriptRoot 'daily-backup.cjs'
if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf)) { throw 'Node não encontrado.' }
if (-not (Test-Path -LiteralPath $script -PathType Leaf)) { throw 'daily-backup.cjs não encontrado.' }
if (-not [IO.Path]::IsPathRooted($Destination) -or $Destination.Contains('"')) { throw 'Informe um caminho absoluto válido.' }
$action = New-ScheduledTaskAction -Execute $NodePath -Argument ('"' + $script + '" "' + $Destination + '"') -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At '22:00'
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10) -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew
$existing = Get-ScheduledTask -TaskName 'Fornalha-Backup' -ErrorAction SilentlyContinue
if ($existing -and $existing.State -eq 'Running') { throw 'A tarefa de backup está em execução. Aguarde terminar antes de atualizar.' }
Register-ScheduledTask -TaskName 'Fornalha-Backup' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Backup Fornalha às 22h, verificado, com retenção de 30 dias.' -Force
Write-Output 'Tarefa cadastrada. Execute Start-ScheduledTask -TaskName Fornalha-Backup e confira LastTaskResult antes de considerar a configuração concluída.'
