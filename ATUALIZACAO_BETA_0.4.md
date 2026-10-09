# Atualizar o Dell sem perder dados

Esta atualização inclui identidade Fornalha, ícone original e controle de saída/retorno. IA e envio de e-mail continuam desligados, conforme escolha de terminar os ajustes primeiro.

## Instalação existente

1. Sincronize as vistorias pendentes de todos os celulares antes de atualizar. A regra passa a valer para registros novos recebidos após a atualização; o histórico antigo não será transformado em pendências.
2. No Dell, na pasta `C:\Frota_Fornalha_beta_sem_DNS`, rode `node scripts/backup.cjs`. Guarde a cópia também em outro disco. Pare o aplicativo com Ctrl+C (ou pare sua tarefa, se já tiver sido instalada).
3. Extraia o ZIP da atualização numa pasta separada. Copie os arquivos de código para a pasta do sistema, substituindo as versões anteriores. **Preserve `data`, `runtime.json`, `ngrok.yml`, `tools`, `logs` e `backups`**. O ZIP de atualização não contém esses dados ou credenciais.
4. Execute `node --test tests/*.test.cjs`. Só prossiga se todos passarem.
5. Se os nomes no Dell ainda forem exemplos, copie também `cadastros-recuperados.json` para a pasta do sistema e confira a prévia:

```powershell
node scripts/import-catalog.cjs cadastros-recuperados.json
```

Depois, ainda com o aplicativo parado:

```powershell
node scripts/import-catalog.cjs cadastros-recuperados.json --apply
```

O importador cria backup antes de alterar cadastros, conserva IDs, histórico, fotos e senha. Ele para se encontrar nomes diferentes dos exemplos e dos nomes recuperados: nesse caso, revise os cadastros atuais em vez de sobrescrever. O arquivo contém nomes operacionais e não deve ser publicado no GitHub. Se o Dell já tem os nomes corretos, não precisa importar.

6. Inicie `node server.cjs` e mantenha o ngrok ativo. Abra a URL pública, confira os cadastros no gestor e teste saída → retorno → nova saída.
7. Abra o aplicativo online no celular e recarregue para carregar a versão nova. O ícone/nome de um atalho já instalado pode demorar a atualizar. Se necessário, recrie o atalho **depois de confirmar que não há vistorias pendentes**, sem limpar o armazenamento do site.

## Regras novas

- Sem saída pendente, o motorista começa com Saída. Retorno sem saída é recusado.
- Uma saída impede qualquer nova saída desse motorista até o retorno do mesmo veículo, inclusive em outro dia ou aparelho.
- Selecionar o motorista sugere o retorno e o veículo pendentes. A mensagem informa qual carro precisa retornar.
- Pendência sobrevive a reinício do servidor e mudança de nome. Cadastro inativo com pendência continua disponível para encerrar o retorno, mas não para nova saída.
- A fila offline envia em ordem cronológica. No aparelho, a regra usa o estado conhecido e os registros pendentes; outro aparelho offline pode ter informação desatualizada. O servidor é a validação definitiva. Um conflito permanece salvo no aparelho, como não recebido, para revisão — nunca é apresentado como sucesso.
- Retorno não pode ter data anterior à saída. Não há encerramento automático à meia-noite.
- Vistorias históricas anteriores à atualização continuam nos relatórios sem gerar bloqueios retroativos. Cadastros continuam com IDs estáveis.

## Próxima etapa: agente de IA

Solicitação registrada: analisar vistorias recebidas e avisar os destinatários cadastrados por e-mail quando houver algo importante, manutenção ou avaria nova. Não é apenas um resumo agendado.

Antes de ativar: definir remetente/provedor, destinatários, credencial da IA e critérios de novidade/repetição. Implementar histórico de análises e envios, identificação das ocorrências já avisadas, reenvio em caso de falha e rastreabilidade por vistoria. Falha da IA não pode bloquear o recebimento da vistoria. Não há envio nem conexão à IA nesta atualização.
