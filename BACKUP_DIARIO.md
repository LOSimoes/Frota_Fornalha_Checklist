# Backup diário com retenção de 30 dias

Rotina independente do aplicativo: não é preciso parar o Node ou o ngrok para instalar ou executar.

1. Copie os arquivos de `scripts` do pacote para `C:\Frota_Fornalha_beta_sem_DNS\scripts`, substituindo quando solicitado. Não altere data, runtime.json ou ngrok.yml.
2. Teste no PowerShell do Dell:

```powershell
cd C:\Frota_Fornalha_beta_sem_DNS
node scripts/daily-backup.cjs "C:\FORNALHA MINEIRA\LUCAS\APPs\Backup FFC"
```

3. Deve aparecer `Backup verificado`. Em PowerShell como administrador, cadastre ou atualize SOMENTE a tarefa Fornalha-Backup:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-backup-task.ps1
Start-ScheduledTask -TaskName 'Fornalha-Backup'
```

4. Após terminar, consulte:

```powershell
Get-ScheduledTask -TaskName 'Fornalha-Backup' | Select-Object TaskName,State
Get-ScheduledTaskInfo -TaskName 'Fornalha-Backup' | Select-Object LastRunTime,LastTaskResult,NextRunTime
```

Resultado 0 após a conclusão indica sucesso. Confirme também a nova pasta FFC- no destino. Se ainda estiver Running, aguarde antes de avaliar LastTaskResult. A configuração só está validada depois desse teste como SYSTEM; um teste manual sozinho não confirma as permissões da tarefa.

## Política

- Execução diária às 22h no horário do Dell, sem login. Se perder o horário, executa quando disponível. Até três novas tentativas após falha, com intervalo de dez minutos.
- Cada execução faz uma cópia completa do SQLite (vistorias, fotos, cadastros e auditoria) e admin.json (credencial de acesso protegida por hash). Não inclui código, runtime.json ou token ngrok.
- Abre a cópia somente para leitura, executa integrity_check e confere tabelas e formato da credencial. Isso não substitui um teste de restauração operacional.
- Só depois de verificar o novo backup remove pastas próprias com idade superior a 30 dias. A cópia recém-verificada nunca entra na limpeza. Falha na criação/verificação não inicia limpeza.
- Somente pastas FFC- com marcador retention.json desta rotina, diretamente no destino, são elegíveis. Links/junções, pastas manuais, conteúdo extra e subpastas são preservados. Backups manuais anteriores precisam de revisão manual; não são apagados automaticamente.
- Pastas incompletas de tentativas interrompidas permanecem para revisão. Se a tarefa for encerrada abruptamente e deixar .fornalha-backup.lock, confirme que nenhum backup está rodando antes de removê-lo manualmente. Não remova a trava de uma execução ativa.
- Não há limite em GB: o consumo depende do volume das fotos e da quantidade de execuções nesses 30 dias. Acompanhe o espaço livre. Cópia no mesmo servidor/RAID não protege contra perda total do equipamento ou ataques que atinjam ambos.
- Não configure limpeza genérica de todas as pastas por data. Mantenha as permissões do destino restritas aos administradores e SYSTEM.
