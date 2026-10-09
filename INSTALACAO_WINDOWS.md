# Beta 0.3 — instalação no Dell Windows da Fornalha Mineira

**Atualização em 09/10/2026:** o servidor foi confirmado como Windows Server 2022. Para o beta sem acesso ao DNS, siga [INSTALACAO_SEM_DNS.md](INSTALACAO_SEM_DNS.md), que substitui a etapa 3 abaixo e usa o serviço ngrok no lugar do conector Cloudflare. A opção de domínio próprio abaixo permanece apenas como alternativa futura.

Este roteiro prepara o servidor que fica ligado 24 horas. O endereço sugerido é **https://frota.fornalhamineira.com.br**. Ele ainda não foi criado nem publicado. O site é gerenciado no Wix; ainda precisamos verificar se o domínio foi registrado lá ou apenas conectado, quem hospeda o DNS e qual é a versão do Windows Server. No Dell, `Win+R` → `winver` mostra a versão.

## Como a conexão funciona

Android (Wi-Fi/4G/5G) → endereço HTTPS → túnel → aplicativo no Dell → SQLite e fotos no Dell → painel do gestor.

- O GitHub guarda o código. Ele não recebe vistorias ou fotos.
- Cada aparelho precisa abrir o endereço definitivo com internet ao menos uma vez e carregar o aplicativo. Depois, o checklist pode ser reaberto offline quando o navegador tiver instalado o cache.
- Ao concluir, respostas e fotos ficam no IndexedDB do aparelho. O aplicativo tenta enviar e só mostra “Vistoria recebida” depois de o servidor confirmar.
- Ao recuperar conexão, abrir/retomar a página ou usar Sincronizar, o envio é tentado novamente, sem duplicar o registro.
- Se a internet da fábrica ou o Dell estiver indisponível, o aparelho continua aguardando. Ter 5G no celular não basta se o servidor da fábrica estiver offline.
- Com o aplicativo fechado, esta versão não garante sincronização. Antes de ir embora, o motorista deve abrir o aplicativo e conferir os envios.
- Rascunhos não concluídos ainda não são salvos. Não limpe os dados do navegador nem desinstale antes de sincronizar.
- O painel não envia WhatsApp, e-mail ou mensagens no chat. A área de monitoramento está reservada, sem agente conectado.

## 1. Preparar o Windows

1. Confirme a versão do Windows Server. Instale uma versão de Node.js **24 LTS** compatível com esse Windows, usando o instalador oficial: https://nodejs.org/en/download.
2. Extraia o ZIP do beta em `C:\FrotaFornalha`, de modo que `server.cjs` esteja diretamente nessa pasta.
3. Abra o PowerShell nessa pasta e confira:

```powershell
Set-Location -LiteralPath C:\FrotaFornalha
node --version
npm test
```

Não é preciso instalar pacotes npm. Os dados de teste são temporários, separados dos dados da fábrica.

## 2. Testar primeiro no próprio Dell

Ainda **não copie runtime.example.json**. Rode com a configuração local padrão:

```powershell
node server.cjs
```

1. Abra `http://127.0.0.1:3000/` no próprio Dell.
2. No primeiro início, abra o link de configuração mostrado no terminal e crie a senha do gestor. O link expira em 30 minutos. Não compartilhe esse link.
3. Entre em `http://127.0.0.1:3000/gestor` e ajuste motoristas e veículos nos cadastros.
4. Faça uma vistoria de teste com foto. Confira o recebimento no painel.
5. Mantenha essa janela aberta enquanto testa. `Ctrl+C` encerra o aplicativo.

`127.0.0.1` significa o próprio aparelho. No celular, esse endereço não aponta para o Dell. Uma URL com IP da rede por HTTP também não fornece todos os recursos de instalação/offline; use HTTPS válido para o teste nos Androids.

Se quiser levar os dados e a senha do computador de desenvolvimento para o Dell, gere um backup pela etapa 6 e restaure no Dell com o aplicativo parado. O ZIP do beta NÃO contém dados, fotos ou senha reais.

## 3. Conectar o subdomínio por HTTPS

Opção a avaliar: Cloudflare Tunnel no Dell, apontando o subdomínio para `http://127.0.0.1:3000`. O conector mantém conexões de saída; não é necessário abrir a porta 3000 no roteador. O procedimento padrão exige um domínio na Cloudflare.

**Etapa pendente por causa do Wix:** o Wix permite registros A/CNAME para subdomínios externos, mas informa que domínios registrados no próprio Wix não permitem trocar nameservers. Portanto, não basta criar um CNAME aleatório apontando para um túnel. Precisamos conferir o registrador e o DNS no painel Domínios. Se for necessário manter DNS no Wix, escolheremos um provedor de conexão que ofereça domínio personalizado compatível com esse DNS, ou um endereço separado para o piloto; configuração parcial Cloudflare pode ter requisitos comerciais próprios. Não contrate nem transfira o domínio antes de definirmos esse caminho. O site e e-mail existentes devem ser preservados.

Os passos abaixo só se aplicam **se o caminho Cloudflare estiver confirmado**. Até lá, execute as etapas de instalação e teste local no Dell.

Após confirmar a conta e o DNS:

1. Crie um túnel gerenciado no painel Cloudflare e escolha Windows como conector.
2. Instale o conector seguindo o comando fornecido pelo próprio painel. O token é secreto: use-o no Dell e não o envie ao chat ou GitHub.
3. Configure uma rota publicada: hostname `frota.fornalhamineira.com.br`, serviço HTTP `127.0.0.1:3000`.
4. Preserve o Host público. Se configurar a opção **HTTP Host Header**, use `frota.fornalhamineira.com.br`; o aplicativo valida esse valor.
5. Com o aplicativo parado, copie `runtime.example.json` para `runtime.json`. Confirme `dataDir` e o endereço final. O exemplo mantém o Node restrito a `127.0.0.1`.
6. Reinicie o aplicativo. A partir daí, use a URL HTTPS, inclusive no Dell. O endereço HTTP local deixa de ser o acesso normal porque o Host permitido passa a ser o domínio público.
7. Teste no celular com Wi-Fi e depois com Wi-Fi desligado, usando 4G/5G. O painel do gestor continua exigindo senha.

Não ative cache de páginas/API no provedor. O aplicativo envia `Cache-Control: no-store`; o cache offline é controlado pelo service worker apenas para os arquivos do checklist.

O endereço do motorista dispensa login individual, conforme combinado. Compartilhe-o com a equipe do piloto. Para uma divulgação mais ampla, podemos acrescentar cadastro/autorização dos aparelhos antes de expandir o beta.

## 4. Manter o aplicativo rodando em segundo plano

O conector Cloudflare deve ser instalado como serviço pelo procedimento oficial. Para o aplicativo Node, use o Agendador de Tarefas do Windows, após ter configurado a senha:

1. Crie uma conta de serviço do Windows dedicada, com acesso de leitura ao projeto e escrita apenas nas pastas necessárias (`data`, `logs` e destino de backup). O aplicativo não precisa de administrador.
2. Abra **Agendador de Tarefas → Criar Tarefa**, nome `Frota Fornalha`.
3. Selecione a conta dedicada e **Executar independentemente de o usuário estar conectado**. Informe a senha dessa conta diretamente no Windows.
4. Disparador: **Ao iniciar o computador**, com atraso de 30 segundos.
5. Ação: iniciar `powershell.exe`.
6. Argumentos:

```text
-NoProfile -File "C:\FrotaFornalha\scripts\start-server.ps1" -NodePath "C:\Program Files\nodejs\node.exe"
```

7. Iniciar em: `C:\FrotaFornalha`. Ajuste o caminho do Node se o instalador tiver usado outro local.
8. Em Configurações: reiniciar em caso de falha a cada minuto; não impor limite de duração à tarefa; não iniciar uma segunda instância se já estiver em execução.
9. Se o arquivo baixado for bloqueado, revise e desbloqueie o arquivo pelas Propriedades do Windows conforme a política de execução da empresa; não desative globalmente essa política.
10. Pare a execução manual e execute a tarefa. Confira a URL HTTPS e `logs\server-AAAA-MM-DD.log`.
11. Reinicie o Dell em uma janela combinada com a equipe e confirme que aplicativo e túnel voltam sozinhos.

Não crie duas tarefas/serviços escutando a mesma porta. Credenciais e logs devem ficar acessíveis apenas aos administradores autorizados do servidor.

## 5. Instalar e testar nos Androids

1. No Chrome atualizado, abra a URL HTTPS definitiva com internet.
2. Use a opção do navegador de instalar/adicionar à tela inicial, quando disponível.
3. Selecione motorista, veículo e saída/retorno; registre um problema e use Tirar foto ou Escolher foto. Máximo de seis fotos por vistoria; o aplicativo reduz as imagens antes do envio.
4. Conclua e espere “Vistoria recebida”. No painel, filtre período e veículo e abra a vistoria para ver as fotos.
5. Teste modo avião após o primeiro carregamento: reabra o aplicativo, conclua uma vistoria e veja “Salva neste aparelho”. Retire o modo avião, abra o aplicativo e confirme o recebimento uma única vez.
6. Teste também fechar e reabrir a página com uma vistoria concluída pendente. Faça isso antes de usar o beta na operação diária.

Use primeiro um motorista e uma van por alguns dias. Cadastre os nomes reais antes do piloto. As fotos ainda não substituem avaliação técnica e os alertas são registros para sua análise.

## 6. Backup e restauração

Execute diariamente, preferencialmente para outro disco ou destino de backup da empresa:

```powershell
Set-Location -LiteralPath C:\FrotaFornalha
node scripts/backup.cjs "D:\BackupsFrota\2026-10-09"
```

O destino deve ser uma pasta nova a cada execução. O script cria uma cópia consistente do SQLite, inclusive fotos, e copia o hash da senha (`admin.json`). Se o caminho padrão for utilizado, grava em `backups` dentro do projeto; isso não protege contra perda do disco do Dell. Proteja o backup como dado da empresa. Crie uma tarefa separada no Windows para o backup diário e confira sua conclusão; não há exclusão automática de backups nesta versão.

Para restaurar: pare o aplicativo; preserve a pasta de dados atual; restaure `frota.sqlite` e `admin.json` em uma pasta limpa; configure `dataDir` para essa pasta; inicie e valide login, vistorias e fotos. Não misture arquivos `-wal`/`-shm` de um banco antigo com o banco restaurado. Teste a restauração antes de considerar o backup homologado.

## 7. Atualizações do beta

Faça backup; pare a tarefa do aplicativo; substitua apenas os arquivos de código; preserve `data`, `runtime.json`, `logs` e `backups`; rode os testes e reinicie a tarefa. Os celulares carregam a versão nova quando estão online. Sincronize filas pendentes antes de trocar o domínio, pois o armazenamento local pertence ao endereço usado no navegador.

## Referências oficiais consultadas em 09/10/2026

- Node.js: https://nodejs.org/en/download
- Configurar Tunnel: https://developers.cloudflare.com/tunnel/get-started/
- Serviço Windows: https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/as-a-service/windows/
- Host e conexões de saída: https://developers.cloudflare.com/tunnel/configuration/
- HTTPS e service workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- Subdomínio externo no Wix: https://support.wix.com/en/article/connecting-a-subdomain-to-an-external-resource
- Limite de nameservers no Wix: https://www.wix.com/blog/use-wix-just-as-a-domain-registrar
- Modos de configuração Tunnel: https://developers.cloudflare.com/cloudflare-one/faq/cloudflare-tunnels-faq/

Este roteiro não significa que o Dell, o domínio ou o túnel já foram configurados. Essa etapa será feita com os acessos do responsável pela infraestrutura.
