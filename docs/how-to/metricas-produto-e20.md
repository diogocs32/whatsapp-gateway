---
tipo: how-to
dono: Diogo Santos
revisado_em: 2026-09-29
validade: 90d
---

# Consultar as métricas de produto da E20

Os três endpoints aceitam a autenticação existente (`X-Api-Key` ou JWT do painel).
São leituras/observações; não alteram o guardrail, estado de sessão, envios ou campanhas.
Os DTOs canônicos estão em `packages/contracts/src/index.ts`. Não é necessário publicar
uma versão nova do node n8n 0.4.1 para preservar suas operações atuais.

## Destinatários novos sem resposta

`GET /api/observability/new-recipients/{sessao}` aceita ID ou nome e retorna
`newRecipients`, `responded`, `withoutResponse`, `unresolvedLidRecipients`,
`windowDays:30`, `windowStartedAt`, `computedAt`, `basis` e `coverage`.

Um destino individual entra se seu primeiro envio observado no histórico retido ocorreu
nos últimos 30 dias e não havia mensagem/reação recebida anterior. Cada destino conta uma
vez, independentemente de `source`/`isCold`. Mensagem recebida ou reação posterior conta
como resposta até o instante do cálculo; não há espera de maturação nem limite de 72h.
Os timestamps de mensagem do WhatsApp têm precisão de segundos. Inbound com timestamp
estritamente anterior exclui a relação; no mesmo timestamp do primeiro outbound, a política
observacional conta a interação como resposta. A ordem causal dentro desse segundo é
indeterminada; `createdAt` reflete persistência assíncrona/importação e não desempata essa ordem.
O reply-rate G4 mantém maturidade72h/amostra próprias e é usado por G5; a correlação
segura atual segue [E21/P-103](reply-rate-identidade-e21.md).
Grupos, broadcast/status, newsletter e conversa consigo mesmo ficam fora.

JIDs de telefone `@c.us`/`@s.whatsapp.net` e sufixos de device são equivalentes. Um LID
só se junta ao telefone quando há um vínculo local unívoco no diretório da mesma sessão;
nenhum número é consultado pela rede nem se infere o 9º dígito. LIDs sem vínculo são
contados separadamente e indicados em `unresolvedLidRecipients`. Reação LID sem vínculo
só herda o destinatário do alvo quando `targetKeyId` identifica uma única conversa entre
mensagens recebidas e enviadas, incluindo self-chat, e há alvo outbound nessa conversa;
colisão de chave não atribui resposta ao destino errado. Reações removidas ainda
comprovam uma resposta, como na D-028; sua lápide permanece no banco.

`coverage:'retained-history'` limita a interpretação: retenção e importação parcial podem
apagar um contato anterior, tornando-o novo nesta observação. O resultado não demonstra
primeiro contato absoluto, consentimento, entrega ou restrição do WhatsApp.
A consulta é sob demanda em uma SELECT com snapshot coerente; não é um scrape global.

## Consumo e cota de contacts/check

`GET /api/sessions/{sessao}/contacts/check-quota` retorna `enabled`, `mode:'observe'`,
`limit`, `windowSeconds`, `available`, `used`, `remaining`, `exceeded` e
`retryAfterSeconds`. A leitura não cria nem prolonga a janela.

- `CONTACT_CHECK_MAX_PER_WINDOW=0` (default) desliga o observador, inclusive acesso ao Redis.
- Um valor positivo ativa uma cota **informativa** por sessão; `CONTACT_CHECK_WINDOW_SECONDS`
  (default 86400) define a janela a partir do primeiro lote.
- Cada POST válido conta os números distintos após remover a máscara, dentro daquele lote.
  Repetição em outro lote conta novamente. Isso mede unidades distintas do lote, não pessoas
  distintas na janela nem número de USyncs. Falha posterior da engine não reembolsa.
- O Redis incrementa e fixa o TTL atomicamente entre réplicas; só guarda ID da sessão e
  contador, sem telefones. Consumo acima do limite gera WARN e `exceeded:true`.
- O excesso não bloqueia nem altera o array/status de `POST …/contacts/check`.
  Falha de Redis devolve `available:false` na leitura; o POST continua após no máximo 2s
  de espera do observador. Uma escrita tardia pode consumir conservadoramente.

Não há enforcement nem novo 423/429. Ativar bloqueio exige decisão explícita posterior
e revisão da compatibilidade n8n. A cota não é chamada pelos envios. A consulta Baileys
preserva uma consulta por número distinto no lote, expandindo máscaras/repetições
na resposta original. Batching sem associação comprovada entre número pedido e JID
canônico continua em P-102. Consultas reais ao WhatsApp não fizeram parte desta prova.

## Inventário da conta

`GET /api/sessions/account-inventory/snapshot` retorna `sessions` e os totais
`PERSONAL`, `BUSINESS`, `UNKNOWN`. Cada item contém apenas ID/nome/engine,
`accountType`, `platform` e `source`; credenciais/chaves não são carregadas nem expostas.

Na rc14, `smba`/`smbi` comprovam Business pelo helper oficial `isWABusinessPlatform`.
`android`/`iphone` são classificados PERSONAL por inferência da plataforma recebida no
`pair-success` e dos pares distintos ANDROID/SMBA e IPHONE/SMBI no protobuf oficial.
Não se usa o SO configurado no browser para essa classificação. Demais valores (inclusive
`ios`), ausência ou tipo inválido ficam UNKNOWN; ausência de marcador não comprova conta pessoal. WWEBJS também fica UNKNOWN porque `client.info` é memória privada da
engine, sem plataforma persistida para essa leitura. P-101 acompanha a evidência faltante.
Não se abre socket/Chromium nem se consulta perfil Business pela rede para inventariar.

## Leads e operação manual

O A/B de P-061 usa os métodos reais das engines com sockets/Client substituídos por
fixtures, incluindo `addressingMode:lid`, leitor não-admin e LID sem telefone local.
Prova o contrato `/leads` e a resolução local nesses dados; não demonstra paridade de
um grupo real nem permite remover WWEBJS/Chromium (D-021).

Merge/CI não são deploy. O dono faz os deploys C/D/E/F e respectivos canários, com
B-004 stop-first, B-005 backup/restore, B-007 diagnóstico e P-099 sem drenar filas.
P-100 continua aberta; não se usa force-close nem se reduzem retries. Na janela manual
da E20, conferir esses três endpoints com a autenticação existente e registrar os
marcadores no chip de teste; comparar leads das duas engines somente no grupo escolhido
pelo dono. Decisão sobre canal oficial, políticas add/createGroup e piloto whatsmeow
continuam em P-064, fora desta mudança de código.

## Fontes conferidas

- [Baileys rc14, plataforma Business](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/generics.ts),
  confrontado com a lib instalada `lib/Utils/generics.js`,
  [plataforma do pair-success](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/validate-connection.ts)
  e [enum Platform do protobuf](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/WAProto/WAProto.proto).
- [Baileys rc14, onWhatsApp](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/socket.ts)
  e [parser USync](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/WAUSync/USyncQuery.ts):
  filtra não-existentes e não preserva telefone de entrada no resultado.
- [WWEBJS ClientInfo](https://docs.wwebjs.dev/ClientInfo.html) e
  [Contact.isBusiness](https://docs.wwebjs.dev/Contact.html): plataforma e atributo Business
  são conceitos distintos; pin instalado 1.34.7/`1780711` preservado.
- [Redis EVAL](https://redis.io/docs/latest/develop/programmability/eval-intro/),
  [INCRBY](https://redis.io/docs/latest/commands/incrby/) e
  [PEXPIRE](https://redis.io/docs/latest/commands/pexpire/), com ioredis5.11.1 instalado.
- [Prisma queries SQL parametrizadas](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
  e [PostgreSQL snapshot Read Committed](https://www.postgresql.org/docs/18/transaction-iso.html).

Verificações locais, revisão e CI são registrados no DONE E20 e no PR da etapa.
