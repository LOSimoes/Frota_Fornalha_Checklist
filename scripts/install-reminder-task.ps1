param([string]$NodePath = 'C:\Program Files\nodejs\node.exe')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'email.json'
if (-not (Test-Path -LiteralPath $NodePath)) { throw 'Node nao encontrado.' }
if (-not (Test-Path -LiteralPath $configPath)) { throw 'Configure email.json antes de agendar.' }
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
if (-not $config.enabled -or -not $config.sender -or -not $config.apiKey) { throw 'Configure remetente validado e chave antes de agendar.' }
if ((Get-TimeZone).Id -ne 'E. South America Standard Time') { throw 'Configure o fuso do servidor como Brasilia antes de agendar as 6h.' }
$script = Join-Path $PSScriptRoot 'morning-reminder.cjs'
$action = New-ScheduledTaskAction -Execute $NodePath -Argument ('"' + $script + '" --send') -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At '06:00'
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10) -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'Fornalha-Lembrete' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Lembrete de vistorias, segunda a sexta as 6h.'
Write-Output 'Tarefa criada. Confirme o primeiro envio e a entrega na caixa de entrada.'
