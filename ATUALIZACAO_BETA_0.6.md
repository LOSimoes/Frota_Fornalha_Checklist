# Fornalha — beta 0.6

Inclui a quilometragem da versão 0.5 e as funções abaixo. Este pacote não contém dados, senhas, tokens ou configurações do Dell.

## Funções

- Rascunho automático no mesmo navegador: identificação, etapa, respostas, observações e fotos processadas. Aguarde “Rascunho salvo neste aparelho” antes de fechar. Não é envio ao gestor. Use uma aba de vistoria por aparelho; limpar os dados do navegador remove rascunhos e a fila ainda não enviada.
- Ao concluir, a fila de envio assume o registro. Reabrir não transforma uma vistoria já enfileirada em outra nova. O descarte de rascunho não remove registros concluídos.
- Gestor: corrija quilometragem em “Vistorias do período → Histórico e correção do gestor”. A justificativa é obrigatória. O original, valores anteriores, novos valores e horário são preservados. Como há um único acesso, o autor aparece como “Gestor”.
- Trocar veículo ou cancelar um lançamento por engano é permitido apenas na saída ainda pendente. A troca exige veículo ativo com o mesmo tipo de refrigeração. Viagens encerradas não podem ser canceladas nem ter o veículo trocado nesta versão. Cancelamento libera o motorista, mantém auditoria e exclui o registro dos totais e leituras. Não gera retorno fictício.
- A situação dos veículos mostra quem tem retorno pendente. Na identificação, há aviso se outro motorista tem saída aberta no veículo selecionado. É um aviso, não bloqueio; dados de aparelhos offline só entram após sincronizar.
- Cada relato de defeito/alerta pode ficar Aberto, Em avaliação, Manutenção agendada ou Resolvido, com anotação e histórico. O acompanhamento é por item e vistoria; não agrupa automaticamente relatos repetidos. Resolver não apaga o defeito nem reduz a frequência histórica.

## Atualizar o Dell

1. Conclua ou anote vistorias em preenchimento na versão antiga; ela ainda não salva rascunhos. Sincronize registros pendentes dos aparelhos. Faça a cópia manual antes de trocar o código:

```powershell
cd C:\Frota_Fornalha_beta_sem_DNS
node scripts/backup.cjs
```

2. Pare o aplicativo com Ctrl+C na janela que executa `node server.cjs`. O ngrok pode continuar aberto.
3. Extraia `Fornalha_atualizacao_0.6.zip` em uma pasta separada. Copie o conteúdo para a pasta atual, substituindo o código. Preserve `data`, `runtime.json`, `ngrok.yml`, `tools`, `logs` e `backups`. Não reimporte cadastros nem substitua o banco.
4. Execute:

```powershell
node --test tests/*.test.cjs
node server.cjs
```

São 35 testes. Se houver falha, pare antes de iniciar. As tabelas de auditoria são criadas automaticamente sem apagar vistorias.

5. Reabra o aplicativo online no Android. Confira que aparece o indicador de rascunho. Se houver tela antiga, feche e reabra após carregar online; não limpe dados do navegador com envios pendentes.
6. Faça um piloto com um motorista: saída, foto, recarga durante preenchimento, envio, consulta no gestor e retorno. Confira os cadastros e leituras existentes. Demonstrações locais não foram copiadas para este pacote.

## Validação feita no desenvolvimento

35 testes automatizados aprovados, incluindo autenticação das novas rotas, reenvio idempotente após correção/cancelamento, persistência, concorrência por revisão, histórico de ocorrências, fila com fotos e rascunhos. No navegador de demonstração: recuperação da etapa e resposta após recarga, alteração da quilometragem refletida no painel e situação da ocorrência atualizada.

Ainda falta a conferência em Android real no Dell após instalar. Inicialização automática, backup diário fora do disco do sistema e IA/e-mail ficam para a etapa seguinte. Não reverta para código anterior após começar a usar correções: versões antigas não entendem essas alterações. Se necessário, interrompa o uso e avalie a restauração do backup com os registros posteriores preservados.
