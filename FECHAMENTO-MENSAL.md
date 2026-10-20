# Fechamento mensal

O PDF contém resumo, todos os registros do período (cancelados identificados), respostas, níveis, temperatura informada, relatos, correções e providências registradas. Não atribui responsabilidade automaticamente.

Inclui fotos de problemas e fotos gerais do mesmo veículo no dia do fato ou nos dois dias corridos anteriores. Considera também as fronteiras entre meses. Não inclui fotos gerais sem relação com problema. Histórico e fotos originais permanecem no sistema nesta versão: a seleção do PDF não executa exclusão.

O fechamento fica disponível no terceiro dia do mês seguinte, permitindo observar ocorrências dos dias 1 e 2. A tarefa verifica diariamente às 01h (horário do servidor), recupera meses pendentes e cria nova versão quando recebe registros atrasados ou alterações. PDFs anteriores são preservados, sem expiração automática. Cada PDF tem recibo JSON com hash, número de páginas e fotos incluídas.

Depois de atualizar o código no Dell e executar os testes:

```powershell
cd C:\Frota_Fornalha_beta_sem_DNS
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-monthly-task.ps1
Start-ScheduledTask -TaskName 'Fornalha-Fechamento'
Get-ScheduledTaskInfo -TaskName 'Fornalha-Fechamento' | Format-List LastRunTime, LastTaskResult, NextRunTime
```

Destino padrão: `C:\FORNALHA MINEIRA\LUCAS\APPs\Backup FFC\Fechamentos mensais`.
Para executar manualmente:

```powershell
node scripts/monthly-report.cjs "C:\FORNALHA MINEIRA\LUCAS\APPs\Backup FFC\Fechamentos mensais"
```

Resultado 0 sem PDF pode significar que ainda não existe mês fechado. O PDF não substitui o backup restaurável do banco. A retenção de 30 dias dos backups não remove esta pasta.

A biblioteca PDF é distribuída em `vendor/` com licença MIT, dispensando instalação de pacotes no servidor. Falhas de leitura de foto ou geração interrompem o fechamento; nenhum registro é apagado.
