---
dono: gateway / observability e guardrail
revisado_em: 2026-09-30
---

# Reply-rate: reação com alvo ambíguo (E21/P-103)

O `keyId` de mensagem tem índice por sessão, mas não é UNIQUE. A reprodução histórica
[SELECT-only](../reference/e20-reply-rate-key-collision.sql) mostra uma reação LID desconhecida
contando como duas respostas, tanto ao cold quanto a follow-up. Isso foi reproduzido localmente;
nenhuma ocorrência em produção foi constatada.

## Atribuir resposta

- Chat explícito compatível identifica a conversa; normaliza device e `@c.us`. Alias local
  LID→PN só vale se houver um único PN distinto naquela sessão. PN/LID já mapeado para outro
  chat nunca muda de conversa pelo alvo.
- LID sem alias só infere alvo individual cuja chave pertença a um único chat entre **todas**
  as mensagens da sessão. A seleção de chaves usadas por reações limita custo, mas não filtra
  tempo, lado, cold, self-chat ou grupo das mensagens desses alvos. Duplicatas no mesmo chat
  continuam unívocas. LID individual não infere alvo em grupo/canal.
- Mensagem recebida no mesmo `chatJid` preserva o casamento anterior; interação de reação no
  mesmo chat também conta mesmo se o alvo já não estiver retido. Não houve consulta de rede.
- Preserva 72h, maturidade, tombstone/removida e relógio anterior da reação ao próprio alvo.
  Criação dentro da janela seguida de troca/remoção tardia continua contando por
  `LEAST(timestamp,createdAt)`. Reação antiga trocada dentro e novamente fora da janela
  continua sendo o limite histórico aceito de uma linha mutável.

## Dado inconclusivo e guardrail

`ambiguousMature` conta cold maduros sem outra resposta certa que possuem reação potencial
com alvo ambíguo ou alias contraditório. Não conta reações nem remove cold da amostra.
`responded` e `replyRate` mostram o valor confirmado; `reliable=false` quando
`ambiguousMature > 0` (ou a amostra estiver abaixo de Nmin). O diagnóstico é calculado, sem coluna/migration nova; o snapshot persistido
fica fora da mediana da frota pela confiabilidade falsa.

Após sticky/manual/cooldown e Nmin, avaliação com ambiguidade mantém o estado atual e não
emite transição por esse dado. Não presume resposta nem ausência; quarentena antiga permanece
até evidência suficiente ou override. Amostra sem ambiguidade mantém os limiares anteriores.
Nenhuma rota, env, estado ou código de envio novo; campo aditivo em `ReplyRateMetricDto` e
[contrato de integração](../INTEGRACAO.md). A métrica30d E20 continua independente de G4.

## Validar sem conta real

`npm run test:e2e -w apps/gateway -- test/reply-rate-identity.e2e-spec.ts` exercita fixtures
Prisma/SQL com SessionManager falso, sessão STOPPED/autostart=false e APIs autenticadas.
Não usar POST /sessions para fixtures de smoke: ele chama start mesmo autostart=false.
Testes devem provar colisões direto/follow-up/inbound/self/grupo, chat explícito, LID unívoco,
alias contraditório, tempo/remoção e efeito no snapshot/mediana/estado/evento.

Deploy/canário permanecem manuais após os pré-requisitos C/D/E/F, B-004/B-005/B-007.
Snapshots pré-E21 confiáveis podem integrar a mediana por até24h. Na janela manual,
recalcular reply-rate7d da frota antes de avaliar enforce/canário, ou aguardar expiração
desses snapshots; GET reply-rate grava somente a métrica, não aplica G5. A etapa não
executou esse procedimento em produção.

P-100 continua aberta; não usar force-close/retries reduzidos nem drenar filas P-099.

## Fontes verificadas

- Prisma instalado 7.10.0: `$queryRaw` tagged template parametriza sessão/janelas; consulta
  retorna `count(*)::int` para preservar números JSON. [Documentação oficial](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries).
- PostgreSQL18: [EXISTS e subconsulta correlacionada](https://www.postgresql.org/docs/18/functions-subquery.html),
  [FILTER de agregações](https://www.postgresql.org/docs/18/sql-expressions.html) e
  [materialização de WITH](https://www.postgresql.org/docs/18/queries-with.html).
  Consultados via Context7/documentação oficial em 30/09; materialização conferida
  também na fonte oficial online. SELECT mantém uma única fotografia;
  projeções excluem raw/text/media e alvos são limitados às chaves das reações.
