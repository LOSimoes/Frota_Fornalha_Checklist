# Fornalha 0.7 — conferência diária e ocorrências

## O que muda

- A captura passa a registrar saída, sem exigir retorno. Retornos históricos e envios offline antigos são preservados.
- Responsável pela conferência separado do motorista; o responsável é lembrado neste aparelho.
- Pendências por veículo na abertura e no gestor: toda saída de dia anterior pede nova conferência. A pendência atravessa finais de semana até nova saída. Não confirma que o carro voltou fisicamente.
- Ordem: lataria, luzes, pneus/freios, segurança/painel/cintos, motor/óleo, refrigeração quando aplicável, revisão.
- Ocorrência rápida para batidas, defeitos e quebra na rua; motorista e km opcionais. Não substitui vistoria diária.
- Até 10 fotos por registro, com compressão. Rascunhos separados para vistoria e ocorrência.
- Última leitura de km sugerida e editável. Não atribui diferenças automaticamente ao motorista.

## Atualizar o Dell

1. Faça um backup com `node scripts/daily-backup.cjs "C:\FORNALHA MINEIRA\LUCAS\APPs\Backup FFC"`.
2. Pare `Stop-ScheduledTask -TaskName 'Fornalha-App'` e confirme que o aplicativo parou.
3. Extraia o pacote de código por cima de `C:\Frota_Fornalha_beta_sem_DNS`. Preserve `data`, `runtime.json`, `email.json`, `ngrok.yml`, `tools`, backups e logs. O pacote não contém esses dados.
4. Rode `node --test tests/*.test.cjs`. Só prossiga sem falhas.
5. Inicie `Start-ScheduledTask -TaskName 'Fornalha-App'`. Mantenha o serviço ngrok.
6. Reabra a página no celular conectado. Confira os cadastros e teste uma vistoria real. Rascunhos antigos voltam à identificação para revisar os novos itens; não copie respostas OK automaticamente.

## E-mail — preparado, ainda não ativado

Destino: lucas@fornalhamineira.com.br. Segunda a sexta às 6h, horário de Brasília. Envia somente quando houver veículos pendentes; sem IA.

Implementação usa a API transacional Brevo: https://developers.brevo.com/docs/send-a-transactional-email . Precisamos de uma conta, remetente validado e chave API. Requisitos de autenticação do remetente/domínio devem ser resolvidos na conta antes da ativação. Não envie a chave no chat.

No servidor, copie `email.example.json` para `email.json`; preencha remetente e chave localmente e habilite `enabled`. Restrinja leitura desse arquivo aos administradores e SYSTEM. Ele não é servido pelo site nem incluído no Git. Guarde a configuração em local seguro separado; o backup do banco não inclui esse arquivo.

Prévia sem enviar: `node scripts/morning-reminder.cjs`.
Depois de configurar, instale com `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install-reminder-task.ps1`.

O agendamento só é criado com configuração preenchida e fuso correto. Confira LastTaskResult, o painel do provedor e a caixa de entrada após o primeiro envio. Aceitação pela API não garante entrega. O script evita repetição após confirmação no mesmo dia; se houver interrupção entre aceitação e gravação do recibo pode haver duplicidade. Uma trava remanescente exige verificar se não há envio em execução antes de removê-la. Execuções recuperadas após 10h aguardam o próximo dia útil.

Esta configuração ainda depende da conta remetente: nenhum e-mail real foi enviado nos testes.
