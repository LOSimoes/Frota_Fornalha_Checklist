# Quilometragem — beta 0.5

Pacote de código para atualizar o Dell instalado em `C:\Frota_Fornalha_beta_sem_DNS`. Nenhum dado do banco, credencial, configuração de túnel ou cadastro recuperado acompanha este ZIP.

## Atualização em etapas

1. Sincronize as vistorias concluídas pendentes dos celulares. No Dell, execute `node scripts/backup.cjs` na pasta do sistema e guarde a cópia.
2. Pare apenas o aplicativo com Ctrl+C na janela de `node server.cjs`. Deixe o ngrok ativo.
3. Extraia `Fornalha_atualizacao_0.5.zip` em uma pasta separada. Copie seu conteúdo para a pasta atual, substituindo o código. Não exclua a pasta antiga: preserve `data`, `runtime.json`, `ngrok.yml`, `tools`, `logs` e `backups`.
4. Rode `node --test tests/*.test.cjs`. Esta versão tem 30 testes. Se houver falha, não inicie antes de revisar.
5. Não importe os cadastros novamente: os nomes existentes continuam no banco. Inicie `node server.cjs` e recarregue a página online para obter a nova versão.

## Conferência antes do piloto

- Selecione um veículo com retorno anterior: a saída deve sugerir o fechamento daquele carro. Sem retorno, usa a última leitura identificada como tal; sem leituras, fica vazio.
- Edite a quilometragem e avance/volte: deve conservar o valor digitado. Troque o carro: deve trazer a referência do carro selecionado.
- No retorno, o campo fica vazio e a leitura da partida aparece como referência. Digite o valor atual do painel.
- No gestor, confira a seção Quilometragem dos veículos e abra o histórico. Ela não depende do período do relatório de defeitos e considera apenas dados recebidos.
- Teste uma correção com observação; o histórico mantém a leitura informada. Valor menor gera aviso, sem impedir envio. Um salto antes da saída não é atribuído automaticamente ao motorista.
- Teste envio offline e retomada; uma leitura antiga enviada depois não deve virar a mais recente. Outros aparelhos offline podem ter referências desatualizadas.

O histórico existente alimenta a tela sem recadastrar leituras. O sistema não mede a quilometragem em tempo real nem faz diagnóstico de manutenção. Média diária e quilômetros por motorista permanecem como próxima etapa, usando pares de saída/retorno e sem misturar o intervalo anterior à saída.

Antes de colocar na rotina, terminar a inicialização automática do aplicativo/túnel, programar backup em outro destino e validar o piloto com um motorista. IA e e-mail continuam desligados.
