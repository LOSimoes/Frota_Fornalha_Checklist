# Beta no Dell Windows Server 2022, sem acesso ao DNS

Status: roteiro preparado; instalação no Dell e testes externos ainda pendentes.
Use um endereço HTTPS atribuído à sua conta ngrok. O site da empresa não precisa mudar.
O banco e as fotos ficam no Dell; as conexões passam pelo serviço ngrok.

## 1. Preparar o aplicativo

No Dell, siga as etapas 1 e 2 de INSTALACAO_WINDOWS.md: Node.js 24 LTS, arquivos em C:\FrotaFornalha, testes e criação da senha local do gestor. Confirme uma vistoria de teste antes de continuar. Pare o aplicativo com Ctrl+C.

## 2. Conta e conector

Entre em https://dashboard.ngrok.com e obtenha o endereço atribuído à conta em Domains. Baixe o agente Windows pelo site oficial https://ngrok.com/download e deixe ngrok.exe em C:\FrotaFornalha\tools. Não mova o executável depois de instalar o serviço.

O plano gratuito tem 1 GB de transferência de saída e 20 mil requisições HTTP por mês. Também apresenta uma página intermediária de acesso no navegador. Confira Usage durante o piloto; o plano não garante capacidade para toda a operação. Não é necessário contratar um plano para este teste inicial.

## 3. Configurar os dois arquivos

1. Copie ngrok.example.yml para ngrok.yml na pasta do aplicativo.
2. Antes de inserir a credencial, nas Propriedades → Segurança do arquivo ngrok.yml, restrinja leitura/escrita aos administradores autorizados e SYSTEM. Remova permissões herdadas de usuários comuns. O serviço precisa conseguir ler esse arquivo.
3. Abra ngrok.yml no Bloco de Notas. Substitua o endereço de exemplo pelo domínio exato da conta. Cole o authtoken somente nesse arquivo local, no lugar do marcador. Não envie esse arquivo ao chat, GitHub ou em um ZIP. Salve e feche.
4. Se ainda não houver runtime.json, copie runtime.example.json para runtime.json. Se já existir, edite o existente preservando dataDir e a porta.
5. Em runtime.json, use host 127.0.0.1, port 3000 e origin igual à URL HTTPS do ngrok, sem barra final. O dataDir deve apontar para a pasta que contém admin.json e frota.sqlite do teste local; na instalação padrão, C:\FrotaFornalha\data. Não aponte para uma pasta vazia.

Não configure reescrita do cabeçalho Host no ngrok. A aplicação confere o domínio público. Variáveis de ambiente PORT e FROTA_* têm precedência sobre runtime.json; confira se não existem valores antigos na conta que executa a tarefa.

## 4. Testar a conexão

No PowerShell do Dell:

```powershell
Set-Location -LiteralPath C:\FrotaFornalha
.\tools\ngrok.exe config check --config C:\FrotaFornalha\ngrok.yml
node server.cjs
```

Se a validação do ngrok falhar, corrija antes de continuar. Em outra janela:

```powershell
C:\FrotaFornalha\tools\ngrok.exe start frota --config C:\FrotaFornalha\ngrok.yml
```

Abra a URL HTTPS atribuída à conta, inclusive no Dell. Após mudar origin, o endereço HTTP local deixa de ser o acesso normal. No celular, desligue Wi-Fi e teste por 4G/5G: envie uma vistoria com foto, entre em /gestor com a senha e confira o registro. O formulário do motorista permanece sem login individual conforme o escopo do beta.

## 5. Manter ligado após sair do Windows

Configure a tarefa do aplicativo seguindo a etapa 4 de INSTALACAO_WINDOWS.md. Pare a execução manual antes de iniciar a tarefa para evitar duas instâncias.

Pare também o ngrok manual com Ctrl+C. No PowerShell como administrador do Dell, instale o conector como serviço:

```powershell
C:\FrotaFornalha\tools\ngrok.exe service install --config C:\FrotaFornalha\ngrok.yml
C:\FrotaFornalha\tools\ngrok.exe service start
```

O serviço inicia os endpoints do arquivo. Confira o estado em Serviços do Windows e erros no Visualizador de Eventos. Não abra a porta 3000 no roteador. Se já existir um serviço ngrok de outro sistema, não o substitua; revise essa instalação primeiro.

Em uma janela combinada com a fábrica, reinicie o Dell e confira novamente o acesso externo, o login e o envio com foto. Só considere a inicialização automática validada depois desse teste.

## 6. Homologar o beta

- Execute os testes Android online/offline e retomada da etapa 5 do guia Windows. O primeiro acesso exige internet. A sincronização exige reabrir/retomar o aplicativo; não é garantida com ele fechado.
- Configure e teste backup/restauração conforme etapa 6 do guia Windows, em outro disco/destino. Guarde separadamente a configuração local protegida do túnel; o backup do banco não inclui seu authtoken.
- Cadastre nomes reais e comece com um motorista. Confira filtro por veículo, período, impressão e fotos no gestor.
- Antes de trocar de endereço no futuro, sincronize todas as vistorias pendentes: o armazenamento do celular pertence à URL usada.
- Mensagens automáticas e o agente de monitoramento continuam pendentes; o túnel não implementa esses recursos.

## Referências

- https://ngrok.com/docs/pricing-limits/free-plan-limits
- https://ngrok.com/docs/gateway/agent/config/v3
- https://ngrok.com/docs/gateway/agent/service

Consultadas em 09/10/2026. Não compartilhe authtoken, senha, ngrok.yml ou dados reais ao pedir ajuda; informe a etapa e o erro sem credenciais.
