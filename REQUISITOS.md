# Frota Fornalha — requisitos da primeira versão

Status: levantamento iniciado em 07/10/2026 e atualizado em 08/10/2026. Requisitos confirmados e propostas abaixo devem permanecer distinguíveis até a revisão com o responsável.

## Confirmado pelo responsável

Atualização de 09/10/2026: servidor Dell separado, Windows, ligado 24 horas; domínio da empresa `fornalhamineira.com.br`, site gerenciado no Wix. Subdomínio sugerido para o beta: `frota.fornalhamineira.com.br`, ainda não configurado. Registrador/DNS efetivo e versão do Windows Server pendentes de confirmação. O beta inclui fotos e filtro de veículo somente no gestor. Espaço de monitoramento futuro reservado, sem ativação de agente ou notificações. Guia de instalação e scripts de inicialização/backup adicionados.

- Seis veículos: dois Fiat Mobi; três Renault Master (duas curtas e uma longa); uma Fiat Ducato 2025.
- Master: uma 2024, uma 2018 e uma zero km cujo ano de fabricação/modelo precisa ser confirmado. A longa foi identificada no histórico como 2018; confirmar cadastro final.
- Anos dos Mobi, placas, apelidos e quilometragens ainda pendentes.
- Três motoristas atualmente, com previsão de quatro até o fim de 2026. Todos usam Android com 4G/5G.
- Motorista seleciona seu nome e o veículo, sem senha ou PIN na primeira versão. O nome selecionado é uma declaração, sem autenticação de identidade.
- Vistorias de saída pela manhã, aproximadamente 06h–09h, e de retorno aproximadamente 15h–18h, no fuso America/Sao_Paulo.
- Operação regular de segunda a sexta-feira.
- Carga transportada nas vans refrigeradas: pão de queijo congelado. Faixa operacional ideal informada pelo responsável: −18 °C a −16 °C; trata-se de informação da operação, ainda sem validação documental do produto.
- Os dois Fiat Mobi são carros dos vendedores, sem refrigeração. Há dois vendedores além dos três motoristas informados. Proposta: permitir que vendedores também selecionem seu nome para vistoriar os Mobi.
- Confirmadas quatro vans refrigeradas: três Renault Master e uma Fiat Ducato, além dos dois Mobi dos vendedores. Novos veículos poderão ser cadastrados futuramente.
- Correção do responsável em 08/10/2026: o levantamento de temperatura serve para indicar possível necessidade de manutenção da refrigeração. Substitui a proposta anterior de alerta de descongelamento acima de −16 °C.
- Regra atualizada pelo responsável após teste em 08/10/2026: temperatura maior ou igual a −13 °C, sem limite superior, exibe “Atenção à refrigeração — avaliar manutenção em breve”. Inclui −13, −12, −9, −5 e valores mais quentes. Substitui o intervalo anterior de −14 °C a −10 °C, que deixava −9 °C sem aviso.
- Esse aviso não bloqueia a saída nem determina automaticamente defeito, serviço necessário ou condição de conservação do alimento. A faixa é um critério operacional fornecido pelo responsável, não uma especificação sanitária ou diagnóstico técnico.
- Manter o campo de temperatura da vistoria e um único aviso de manutenção a partir de −13 °C para valores mais quentes. Abaixo de −13 °C não exibir esse aviso, sem rotular a refrigeração como OK apenas pela ausência de alerta. Campo vazio ou inválido não produz aviso e continua sujeito à validação de preenchimento.
- Por enquanto, somente o responsável pela frota (Lucas) pode liberar veículos com problemas.
- Registrar quilometragem, condição do veículo, óleo verificado, freios, motor, refrigeração, temperatura, observações e fotos de ocorrências.
- Preenchimento offline e sincronização posterior por Wi-Fi ou rede móvel.
- Painel com prioridade para batidas/avarias, segurança e manutenção.
- Servidor Windows disponível; arquitetura e forma de acesso externo serão definidas conjuntamente. Repositório GitHub para código.
- Layout responsivo único para computador e Android: campos legíveis, ações em posições fixas, conteúdo sem rolagem horizontal. No celular, exibir a etapa atual em lugar da lista completa e priorizar os campos sobre textos de apresentação.
- Acesso separado ao painel do gestor, protegido por senha e exclusivo de Lucas. A entrada do gestor não aparece na tela dos motoristas. Implementado em 08/10/2026 no servidor Node: configuração inicial de senha, login, sessão de oito horas e saída. Ainda depende de Lucas criar a senha e da configuração de hospedagem/HTTPS para acesso pelos celulares.

## Fluxo proposto

1. Escolher motorista, veículo e saída/retorno.
2. Informar quilometragem e preencher itens aplicáveis, sem respostas OK previamente marcadas.
3. Para cada item: OK, problema, não verificado ou não se aplica. Não se aplica permitido apenas nos itens compatíveis com o cadastro.
4. Problema exige descrição; permite foto e escolha de gravidade. Foto recomendada para avaria, vazamento, alerta do painel ou dano visível; não bloquear o registro quando não for possível fotografar.
5. Revisar e salvar no aparelho. Mostrar separadamente salvo no celular, aguardando envio e recebido pelo servidor.
6. Sincronizar ao abrir/retomar o aplicativo e quando houver conexão; disponibilizar envio manual. Não prometer envio com navegador fechado.
7. Gestor acompanha ocorrência, define providência e registra resolução com data, responsável e evidência.

## Gravidade proposta

- Crítica: possível risco à segurança ou comprometimento da carga. Orientar a não sair/continuar antes de avaliação; destacar no painel. Exemplos: perda de frenagem, pneu com dano perigoso, superaquecimento, alerta de pressão de óleo ou porta/carga sem fixação segura.
- Atenção: precisa de avaliação ou programação de serviço, sem indicação suficiente de risco imediato. Gestor confirma prioridade e prazo.
- Leve: avaria estética ou problema menor, ainda registrado e acompanhado.
- Não sei avaliar: encaminhar para avaliação; nunca converter automaticamente em OK.
- O sistema não diagnostica defeitos nem substitui avaliação técnica. Itens críticos predefinidos não podem perder o destaque apenas porque o motorista escolheu leve.
- Liberação de veículo com problema exclusiva de Lucas nesta versão. Registrar decisão, data e justificativa. O procedimento para avaliação técnica de falhas críticas e itens de segurança não verificados ainda será detalhado. Bloqueio na tela não imobiliza fisicamente um veículo.

## Checklist proposto

### Saída

- Pneus e rodas: condição visual, danos e aparência de baixa pressão. Medição/calibragem conforme rotina e especificação do veículo.
- Freios: percepção de anormalidade, avisos do painel e freio de estacionamento; qualquer teste deve seguir procedimento seguro definido pela empresa.
- Direção: folga ou comportamento anormal relatado.
- Luzes: faróis, lanternas, freio, setas e ré; buzina.
- Visibilidade: para-brisa, retrovisores, limpadores e lavador.
- Segurança: cintos, portas/travas e equipamentos obrigatórios aplicáveis ao veículo.
- Motor: nível de óleo conforme manual, sinais de vazamento, ruídos e alertas. Não pedir ao motorista diagnóstico de troca de óleo.
- Arrefecimento: verificação conforme manual e com condições seguras; nunca orientar abertura de reservatório quente.
- Combustível, painel e aviso de revisão.
- Carroceria: batidas, riscos e danos, com indicação de novo ou já conhecido.
- Carga: limpeza, portas, vedação, fixação e organização.
- Refrigeração quando equipada: funcionamento, temperatura medida em °C, horário, ponto de medição e anormalidades. Faixas dependem do produto e do procedimento da empresa.

### Retorno

- Quilometragem, combustível e temperatura quando aplicável.
- Novas avarias, acidentes/incidentes, alertas, ruídos, falhas de freio/direção e vazamentos percebidos durante a viagem.
- Estado da carga, refrigeração, limpeza e fechamento.
- Problemas ainda pendentes e observações para a próxima saída.

## Painel e manutenção propostos

Implementado em 08/10/2026: período inclusivo com início/fim e atalhos Hoje, Últimos 15 dias e Este mês; relatório imprimível completo de defeitos e alertas; gráfico por categoria com relatos, dias distintos e veículos afetados. Itens não verificados ficam separados. Repetições são relatos, não novos defeitos únicos; os números não constituem previsão automática de falhas.

Cadastros editáveis: criação, renomeação e inativação de motoristas/vendedores e veículos, com identificação estável e nomes preservados nas vistorias. Vínculo manual de veículo tem prioridade; no automático, usa-se o mais frequente nas últimas 30 vistorias do motorista, desempate pelo mais recente. A escolha pode ser alterada pelo motorista sem mudar o vínculo manual. O verde da interface foi mantido conforme solicitado.

- Primeiro: ocorrências críticas, batidas novas e pendências de freio, pneus, direção, motor e refrigeração.
- Situação diária por veículo: saída/retorno recebidos, ausentes ou recebidos fora da janela. Ausência no servidor pode significar registro ainda offline.
- Cobrança regular de vistorias de segunda a sexta; propor exceções para feriados, veículo sem uso e manutenção, com motivo registrado pelo gestor.
- Histórico por veículo e motorista, filtros por data, categoria e gravidade.
- Ocorrências: aberta, em avaliação, serviço agendado e resolvida. Fechar uma vistoria não fecha automaticamente uma ocorrência.
- Evitar duplicar ocorrência conhecida: permitir vincular relato à pendência existente, preservando cada vistoria.
- Manutenção: última execução por data/km, próxima por data/km conforme manual e plano específico. Histórico desconhecido aparece como a confirmar.
- Troca de óleo programada pelo gestor com base em histórico e plano; motorista apenas relata nível/alertas/observações.
- Relatório imprimível e exportação tabular são propostas para a primeira versão.

## Dados e qualidade propostos

- Cadastro editável de veículos, motoristas e equipamentos de refrigeração.
- Data da inspeção e do recebimento separadas; identificador único para impedir duplicação por reenvio.
- Quilometragem inferior à última conhecida gera aviso e exige justificativa, considerando registros offline recebidos fora de ordem.
- Fotos vinculadas ao registro e enviadas com tentativa posterior sem perder a vistoria.
- Preservar registros enviados; correções com histórico e motivo.
- Checklist versionado: mudanças futuras não alteram respostas antigas.
- Proteger o painel administrativo no servidor; acesso simplificado de motoristas não deve permitir ler toda a frota ou resolver ocorrências. Autenticação por senha implementada; futuros endpoints de dados e resolução de ocorrências deverão exigir a mesma sessão e validação de origem.
- HTTPS para uso externo, armazenamento de registros/fotos e backups com teste de restauração. Banco e hospedagem pendentes; GitHub não armazenará dados operacionais.

## Critérios de aceite propostos

Implementação de 08/10/2026: gravação SQLite, consulta autenticada por data, fila IndexedDB, reenvio idempotente e cache da página do motorista. Testes automatizados cobrem API, persistência e lógica de fila; verificação em Android real, fotos, cadastros definitivos e gestão da resolução das ocorrências ainda pendentes. A versão salva somente vistorias concluídas, sem persistência de rascunhos.

- Motorista conclui saída e retorno pelo Android, inclusive sem rede após carregar o aplicativo inicialmente.
- Fechar/reabrir o aplicativo preserva vistoria salva e fotos pendentes.
- Reenvio não duplica vistoria; sucesso de envio só aparece após confirmação do servidor.
- Checklist se adapta à refrigeração e equipamentos cadastrados no veículo.
- Problema crítico e item de segurança não verificado ficam destacados para avaliação.
- Gestor visualiza pendência, registra serviço e consulta histórico sem apagar a evidência original.
- Relatório permite identificar motorista declarado, veículo, tipo, data, km, problemas e providências.

## Confirmações pendentes

1. Placas/apelidos, anos e km; qual Master é curta/longa; nomes dos motoristas.
2. Definir o ponto e a condição de medição da temperatura (por exemplo, leitura do painel após refrigeração estabilizada), para que o histórico de manutenção seja comparável. Aviso de manutenção para temperatura maior ou igual a −13 °C já definido pelo responsável.
3. Procedimento de avaliação técnica para ocorrência crítica ou item de segurança não verificado; liberação exclusiva de Lucas já confirmada.
4. Tratamento de feriados, vistorias fora do horário, viagens adicionais e veículos sem uso no dia; operação de segunda a sexta já confirmada.
5. Acesso administrativo, endereço externo, disponibilidade do servidor, armazenamento e backup.

## Referências consultadas

- PRF: https://www.gov.br/prf/pt-br/seguranca-viaria/orientacoes-de-viagem
- CONTRAN, Resolução 912/2022 (equipamentos obrigatórios; conferir aplicabilidade e alterações no fechamento do checklist): https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucao-contran-no-912-de-28-de-marco-de-2022
- Manuais Renault Master por ano: https://www.renault.com.br/manuais/master.html
- Manuais Fiat: https://servicos.fiat.com.br/manuais.html

Esta proposta operacional não representa certificação de conformidade com todas as normas nem estabelece intervalos universais de manutenção. As regras finais dependem da configuração exata dos veículos, dos manuais correspondentes e da operação da empresa.


## Confirmações de 09/10/2026 — atualização 0.4

- Nome no aplicativo instalado: Fornalha. Aplicar logo e ícone originais, bordô #82110E, vermelho #DA322D, amarelo #F8D814, dourado #ECAF16, creme #FFF1C8, branco quente #FFFDF8 e marrom #2E120A.
- Cada motorista começa com saída. Enquanto existir saída pendente, exigir retorno do mesmo veículo antes de qualquer nova saída; a virada de dia não elimina a pendência.
- Preservar e recuperar cadastros existentes. Não substituir banco operacional ao atualizar código.
- Futuro agente: monitorar novas vistorias recebidas e enviar e-mail aos destinatários cadastrados ao identificar ocorrência importante, manutenção ou avaria nova, evitando repetir avisos sobre a mesma pendência. Configuração da IA adiada pelo usuário até concluir os ajustes. Provedor de e-mail, remetente e destinatários ainda pendentes.
