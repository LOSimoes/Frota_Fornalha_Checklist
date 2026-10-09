# Frota Fornalha

**Beta 0.6.0-beta.1** — roteiro do Dell Windows e conexão por internet em [INSTALACAO_WINDOWS.md](INSTALACAO_WINDOWS.md).

Checklist responsivo com rascunho automático, fila local, SQLite e painel exclusivo do gestor.

Atualização atual, funções e limites: [ATUALIZACAO_BETA_0.6.md](ATUALIZACAO_BETA_0.6.md).

## Iniciar no Windows

Requer Node.js 24 ou superior. Não há pacotes externos para instalar.

Na pasta do projeto, execute:

```powershell
node server.cjs
```

O terminal informa os endereços:

- Motoristas: `http://127.0.0.1:3000/`
- Gestor: `http://127.0.0.1:3000/gestor`
- Prévia móvel: `http://127.0.0.1:3000/celular.html`

No primeiro início, o terminal também mostra um **link de configuração de uso único**, válido por 30 minutos. Abra esse link e crie pessoalmente sua senha (mínimo de 12 caracteres). Não compartilhe o link. Se ele expirar antes da configuração, reinicie o servidor para gerar outro. Depois de configurar, o endereço normal do gestor mostra a tela de login.

A senha é armazenada como hash scrypt com salt aleatório em `data/admin.json`, excluído do Git. Não há senha padrão. A sessão dura oito horas e se encerra ao sair ou reiniciar o servidor. Cinco erros de senha limitam novas tentativas daquela conexão por 15 minutos. Permissões do Windows para a pasta `data` devem restringir acesso a quem administra o servidor.

O servidor inicia apenas no computador local. Para publicar na rede e permitir acesso por Android/4G, ainda falta configurar HTTPS e hospedagem/proxy. O modo externo exige `FROTA_HOST` e `FROTA_ORIGIN` HTTPS; o proxy deve preservar o Host público e encaminhar para o servidor local. Acesso direto aos arquivos HTML não oferece login: use o servidor para testar a área protegida. Não publique a pasta inteira como site estático.

## Estado desta etapa

- Layout adaptável ao computador e celular, com ações fixas.
- Motorista escolhe nome e veículo, sem senha e sem link para o painel administrativo.
- Painel do gestor protegido no servidor, com criação de senha, login e saída.
- Aviso de manutenção da refrigeração para temperatura maior ou igual a −13 °C.
- Vistorias concluídas são gravadas primeiro no IndexedDB do aparelho e enviadas para `data/frota.sqlite`. O registro local só recebe o estado de enviado após confirmação do servidor. Reenvios com o mesmo identificador não duplicam a vistoria.
- Ao abrir/retomar o aplicativo ou recuperar conexão, a fila tenta reenviar. O botão Sincronizar permite tentar manualmente. Erros de validação permanecem no aparelho e são sinalizados para revisão; não são apagados.
- Após o primeiro carregamento online e instalação do service worker, a página de vistoria pode ser reaberta offline. Apenas os arquivos da vistoria são armazenados em cache; login, painel e API não são. O envio com aplicativo fechado não é garantido. Rascunhos não concluídos ainda não são salvos.
- O gestor consulta um intervalo inclusivo (fuso de São Paulo), com atalhos Hoje, Últimos 15 dias e Este mês. A impressão traz a relação completa dos defeitos/alertas do período, sem corte de 100 registros. Saídas e retornos contam vistorias, não veículos distintos.
- O gráfico conta relatos por categoria, dias distintos e veículos afetados. Um mesmo defeito relatado em duas vistorias conta duas vezes, mas no mesmo dia conta apenas um dia. Alertas de temperatura são identificados como manutenção; itens não verificados aparecem em seção separada e não entram como defeitos. Não se trata de previsão automática de falha nem contagem de novos defeitos únicos.
- Cadastros em `/cadastros`: criar, renomear e inativar motoristas e veículos, informar refrigeração e definir veículo habitual. Sem vínculo manual, a sugestão usa o veículo mais frequente nas últimas 30 vistorias recebidas daquele motorista, ordenadas pela data da vistoria; empates favorecem o mais recente. O motorista pode trocar o veículo na identificação.
- IDs de cadastro são permanentes. Novos registros guardam nomes da vistoria; registros antigos preservam seus nomes originais e veículos iniciais, mesmo depois de renomear. Cadastros ativos são armazenados localmente para uso offline. Mudanças são carregadas ao abrir a página com conexão; recarregue após editar no gestor.
- Filtro por veículo no gestor, incluindo registros de carros inativos e renomeados; aplica-se a totais, gráfico e impressão. Espaço de monitoramento reservado, sem agente ou mensagens automáticas ativos.
- Até seis fotos por vistoria, vinculadas aos problemas. O navegador converte para JPEG de no máximo 1.600 pixels e menos de 450 KB por imagem. Fotos ficam na fila offline até o recibo; servidor salva respostas e fotos na mesma transação. A visualização de fotos exige sessão do gestor. O relatório impresso lista ocorrências; fotos podem ser abertas na vistoria.
- Resolução das ocorrências ainda será implementada. Alertas são apontamentos da vistoria, sem ciclo de resolução.
- Recuperação de senha, serviço automático do Windows, backup e instalação nos celulares ainda serão definidos.

## Verificação

```powershell
npm test
```

Os testes verificam os eventos dos campos, fluxos das vans e Mobi, limites de temperatura e proteção HTTP do painel (sessões, origem, bloqueio de arquivos privados e limite de tentativas).

Também verificam persistência após reabertura, consulta privada, validação no servidor, fila offline, erro de armazenamento e confirmação sem duplicação. A simulação da fila usa um adaptador em memória; ainda é necessário validar IndexedDB e abertura offline em Android real.

## Testar o percurso completo

1. Abra a raiz do servidor e conclua uma vistoria com os cadastros de exemplo.
2. Aguarde “Vistoria recebida” (ou confira o estado de espera quando estiver sem conexão).
3. Entre em `/gestor`, selecione a data e use Atualizar para consultar o registro.
4. Execute `node scripts/backup.cjs` para uma cópia consistente do banco, incluindo fotos, e do cadastro de acesso. O teste automatizado verifica reabertura de backup; ainda é necessário homologar rotina e restauração no Dell definitivo.


## Beta 0.4 — identidade e saída/retorno

Marca e ícone originais Fornalha, paleta corporativa e regra por motorista: uma nova saída exige encerrar o retorno pendente do mesmo veículo. O bloqueio é validado no servidor, persiste entre dias e reinícios, e a fila offline envia na ordem cronológica. Histórico anterior à atualização não gera pendências retroativas. Cadastros inativos com viagem aberta ficam disponíveis apenas para encerrar o retorno.

Consulte [ATUALIZACAO_BETA_0.4.md](ATUALIZACAO_BETA_0.4.md) para atualizar preservando dados e recuperar os cadastros sem copiar senha ou banco de desenvolvimento. A IA e os avisos por e-mail ficam para a próxima etapa; ainda não há envio automático.


## Beta 0.5 — quilometragem por veículo

Na saída, sugere o último retorno do veículo (ou última leitura, se não houver retorno), sempre editável. No retorno, mostra a leitura de saída e exige informar o fechamento. Trocar veículo recalcula a sugestão; atualizar o catálogo não sobrescreve uma correção manual. A referência usa a data da vistoria, não a ordem de sincronização. Leituras conhecidas no aparelho também alimentam a sugestão offline.

O gestor vê as últimas leituras e retornos, com histórico por veículo em endpoint autenticado, sem precisar definir período do relatório. Diferença entre retorno anterior e próxima saída não é atribuída ao novo motorista. Valores menores geram aviso na tela, sem bloqueio, e há observação opcional de até 500 caracteres. A leitura informada permanece no histórico. Média diária, distância por motorista e manutenção automática continuam para etapa futura.

Atualização: [ATUALIZACAO_BETA_0.5.md](ATUALIZACAO_BETA_0.5.md). Não é necessário reimportar os cadastros já recuperados.
