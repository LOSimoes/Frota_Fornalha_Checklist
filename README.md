# Frota Fornalha

Modelo responsivo da vistoria e primeira etapa do servidor: acesso exclusivo do gestor.

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
- **As vistorias ainda são demonstrativas:** não há envio, fotos reais, salvamento offline ou relatórios integrados. O painel informa essa condição e não apresenta números fictícios como dados reais.
- Recuperação de senha, serviço automático do Windows, backup e instalação nos celulares ainda serão definidos.

## Verificação

```powershell
npm test
```

Os testes verificam os eventos dos campos, fluxos das vans e Mobi, limites de temperatura e proteção HTTP do painel (sessões, origem, bloqueio de arquivos privados e limite de tentativas).
