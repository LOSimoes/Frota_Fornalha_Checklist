# Fornalha 0.8

Inclui todas as mudanças da 0.7. Use este pacote em lugar do anterior.

- Motorista obrigatório em novas ocorrências.
- CPF e CNH no cadastro privado. Cadastros anteriores são preservados, com campos vazios para completar. Validação de formato (11 dígitos), sem consulta de autenticidade do documento.
- Quatro fotos gerais obrigatórias por saída: frente, traseira, lateral esquerda e lateral direita, mesmo com lataria OK. Contam no limite de dez fotos, restando seis para detalhes. Use enquadramento completo e boa iluminação.
- Gestor: abra o registro no relatório e clique em “Relatório e termo de avarias / comparar fotos”. Imprima ou salve PDF pelo navegador. Inclui motorista, documentos atuais, veículo, fatos, fotos atuais e da saída anterior, manifestação e assinaturas.
- A assinatura é colhida em papel. Não há assinatura digital nem atribuição automática de culpa/cobrança. A comparação de fotos é visual, sem detecção automática de danos.
- CPF/CNH não saem no catálogo público nem no rascunho do celular. O termo e as fotos exigem sessão do gestor.
- Registros antigos e filas offline de versões anteriores continuam aceitos, sem inventar motorista ou fotos ausentes. Reabra o aplicativo conectado após atualizar para carregar as exigências novas.

## Atualização do Dell

Siga o procedimento da ATUALIZACAO-0.7.md: backup, parar Fornalha-App, copiar o código, testar, iniciar Fornalha-App. Preserve data, runtime.json, email.json, ngrok.yml, tools, backups e logs. O pacote não inclui dados reais. A inclusão dos campos do cadastro ocorre automaticamente ao iniciar, sem apagar o banco.

Depois, complete CPF/CNH no painel e confira o termo de um registro. A configuração de e-mail continua pendente da conta remetente.
