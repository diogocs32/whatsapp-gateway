# Sessão: e22-conversas-gateway

- **Status:** ✅ DONE — P-066 + P-072 (parte gateway) entregues; **abre a Onda 8** na branch
  `feature/onda8-conversas` (PR da Onda 8 — sem merge; o deploy G sai no fim da onda, E25). D-028.
- **Início:** 25/09/2026 17:27 BRT (20:27 UTC) — macOS, Node 26.0.0 / npm 11.12.1
- **Objetivo:** Etapa **E22** do [roteiro](../ROTEIRO-ONDAS-2026-09.md) — abre a **Onda 8** (conversas
  fiéis ao WhatsApp Web): **P-066** (conteúdo fiel no gateway — fim do "…" no lugar de
  emoji/reação/localização/contato/enquete; reações em tabela própria; selo "Encaminhada"; reply-rate
  contando reações) + **P-072 parte gateway** (`status` no feed da caixa única; ACK de enviada pelo
  celular; `read` em grupo) + registrar a **P-073** (teste instável do CI).
- **Escopo previsto:** `modules/sessions/infrastructure/{baileys,wwebjs}/` (extração de conteúdo —
  funções puras novas + chamadas), `modules/sessions/application/engine.port.ts`,
  `modules/messaging/` (persister, repositório, controller de mensagens e inbox, ReactionPersister),
  `modules/observability/` (reply-rate, retenção), `prisma/schema.prisma` + migration ADITIVA nova,
  `packages/contracts`, `docs/INTEGRACAO.md`, e2e/unit, mapa gerado e docs de encerramento.
  Pontos de contato globais declarados: `schema.prisma`, `packages/contracts`.
- **Fora do escopo:** painel (E23), encaminhar (E24/E25), produção/Dokploy (R0), recibo de leitura
  pelo painel (decisão do dono: só exibição), `append` do Baileys (E7/P-047), download de mídia (E10/P-050).
- **Branch:** `feature/onda8-conversas` (criada da `main` `4b1f696` — PR #5 e #6 já mergeados; o
  **deploy A ainda não foi feito**, produção segue em `768fb26`).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** execução pelo roteiro de 25/09; Onda 1 fechada e mergeada (PR #5 `59d6c5e`, PR #6
  `4b1f696`), mas produção segue em `768fb26` — todo auto-deploy desligado (D-027), o dono faz o
  Deploy manual. `.cloud` = produção, sem homologação. `GUARDRAIL_ENFORCE=true` em produção (D-017).
- **SESSOES:** ativa alheia `lid-envio-wwebjs` (escopo `modules/sessions/infrastructure/wwebjs/`,
  branch `fix/lid-envio-wwebjs`) — esta etapa toca `wwebjs.engine.ts` só na extração de conteúdo do
  inbound (`onMessageCreate`/reação), sem mexer no envio/LID. Avisos lidos: E4 (rota resolvida —
  `routeOptions.url`/`routeUrlOf`, nunca `req.url`; URL do cliente só via `safeFetch`/
  `fetchImageByUrl`; deploy manual D-027), E3 (Onda 8 — quem mexer em `onMessagesUpsert`/extração ou
  Inbox/Atendimento lê o diagnóstico antes), E2, onda0b (mapa do código: rodar
  `node scripts/mapa-codigo.mjs` e commitar), 15/09 (caixa única), 18/08 (unit sem infra).
- **PENDENCIAS:** P-066, P-072 (parte gateway), P-069 (opcional, fora). B-004 (stop-first) e o
  checklist do deploy A seguem com o dono. B-005/B-006/B-007 com o dono.
- **Roteiro E22 + diagnóstico** (`analise-conversas-whatsapp-web-2026-09.md` §2 S1, §5 C1, §6, §7):
  reação chega em `messages.upsert` e em `messages.reaction` (Baileys) → hoje vira `message` `other`
  com `text:null` + conta no reply-rate e na triagem 🔴; a do dono pelo celular vira handoff G2.
  wwebjs: tipos sem mídia viram `text: msg.body || null`.
- **MAPA-CODIGO §3.2 e §4.2:** `onMessagesUpsert` descarta `type≠notify` (:783), desembrulha
  deviceSent/ephemeral e ignora só protocol/senderKeyDistribution (:844-855); texto em `:864-870`;
  reação `mapBaileysReaction` (:175-197, :653-661) não persistida; `MessagePersister` fire-and-forget
  sem teste de efeito; `wa_messages` sem unique (sessionId, keyId); ACK com rank sent<delivered<read;
  reply-rate casa cold com inbound no mesmo chatJid (`reply-rate.service.ts:100-125`); retenção em
  `retention.service.ts`.
- **Decisões do dono (valem sem nova pergunta):** reação sai do evento `message` do webhook (só
  `message.reaction`) e conta no reply-rate no MESMO deploy → D-xxx; tiques = só exibição.

## Passo 0 — upstream (25/09 20:30 UTC)

- `npm view @whiskeysockets/baileys dist-tags` → `{ latest: '7.0.0-rc14', legacy: '6.7.24' }` (rc14
  publicado 29/07; nada novo). `npm view whatsapp-web.js dist-tags` → `{ next: '1.34.5-alpha.3',
latest: '1.34.7' }`. Instalados: Baileys 7.0.0-rc14 e wwebjs 1.34.7 (pin `1780711`).

## Fontes (documentation-first)

- **Libs instaladas (código lido + PoC offline no scratchpad):** Baileys 7.0.0-rc14 —
  `Utils/messages.js:625-701` (getContentType/normalizeMessageContent/extractMessageContent; lottie,
  pollCreationV4, groupMentioned etc. NÃO desembrulhados), `Utils/process-message.js:64-105`
  (cleanMessage/normaliseKey), `:410-421` (evento `messages.reaction`: `key` = alvo, `reaction.key` =
  mensagem de reação), `Socket/chats.js:917-918` (toda mensagem vai ao `messages.upsert`),
  `Socket/messages-recv.js:1164-1203` (recibos; grupo → `message-receipt.update`),
  `Types/Message.d.ts:19-21` (`remoteJidAlt`/`participantAlt`), `WAProto/WAProto.proto:1273-1274`
  (`forwardingScore uint32`, `isForwarded`), `Defaults/index.js:114` (ptv → HKDF Video). 116 fixtures
  (os 95 campos de `proto.Message`) pelo caminho do fio encode→decode. whatsapp-web.js 1.34.7 —
  `Message.js:50-58, :113-125, :170-198, :330-343`, `Location.js:21-59`, `Reaction.js:16-63`,
  `Client.js:647-721, :1096-1101, :1186-1251`, `Constants.js:85-124, :176-188`; classes reais rodadas
  sobre fixtures (hipóteses `_serialized`/`$1`/`remote` Wid para a chave-alvo da reação).
- **Doc oficial:** Prisma 7 (espelho `~/dioggo-agents/agentes/docs/prisma/7/`: `cli/migrate/dev.mdx:45-65`
  — `--create-only`, v7 sem generate automático; `prisma-schema-reference.mdx:1929-1975` @@unique;
  `prisma-client-reference.mdx:885-910` upsert nativo); PostgreSQL 18 (`postgresql-18-full.txt:103344-
103354` — ADD COLUMN com default não volátil não reescreve a tabela; PoC com 2M linhas: 8,3 ms);
  Baileys wiki (baileys.wiki/concepts/events.md — notify/append; BaileysEventMap `messages.reaction`
  "reaction.text will be falsey" na remoção); docs.wwebjs.dev (Message `isForwarded`, `forwardingScore`
  "maximum value is 127"; Client `message_reaction`); FAQ WhatsApp faq.whatsapp.com/1053543185312573
  ("forwarded through a chain of five or more chats" → "Forwarded many times") e /665923838265756 (✓✓
  azul em grupo = todos leram). Divergências doc × código registradas (escala de status do wiki
  deslocada; votos em `messages.update` comentados na rc14).
- **Relatórios do mapeamento (7 agentes):** scratchpad `e22/report-*.md` (não versionados).

## Diário

- 17:27 — abertura R9, leitura obrigatória feita, branch criada, sessão registrada.
- 17:30–17:45 — **workflow de mapeamento** (7 frentes com PoC): catálogo Baileys (60 de 116
  fixtures viravam "…"), catálogo wwebjs (reação pode sumir com a chave em `$1`), persistência e
  contrato (INTEGRACAO já errava o payload do `message.ack`; `WEBHOOK_EVENTS` sem
  `message.reaction`), reply-rate (hoje a reação CONTA por ser `other` → precisa dos ramos novos no
  mesmo deploy; 3º ramo e `LEAST` da PoC), ACK/P-072 (grupo sem ACK no Baileys; `read-self`),
  consumidores (remetente de reação em grupo errado; `@lid` sem normalizar), docs oficiais.
- 17:35–18:00 — implementação: migration aditiva (aplicada só no dev), repositório/persister de
  reações, reply-rate, retenção, DTO/contratos, funções puras, engines. Voto de enquete do contato
  mantido como mensagem `poll_vote` (reply-rate) — decisão registrada na D-028.
- 18:00–18:20 — testes: 250 unit + e2e novo (11); provas de vermelho contra o código antigo (7/11 no
  e2e com reply-rate e módulo da HEAD; 7/7 no spec da engine com a `baileys.engine.ts` da HEAD).
  Bateria: lint, format, depcruise, tsc, 464/464, builds dos 2 apps, guardas de build, mapa em dia.
- 18:25 — revisão adversarial (5 lentes + 2 céticos por achado) disparada; pausa pedida pelo dono
  (workflow parado); retomada ao "continue". Docs: D-028, INTEGRACAO §3.2/§4/§12/§13, PENDENCIAS
  (P-066 ✅, P-072 com 7 achados para a E23, P-073, P-074), MAPA-CODIGO, ARQUITETURA, CHANGELOG.
- 18:50–19:30 — revisão: 16 achados, **15 confirmados** pelos céticos (1 refutado) e todos tratados —
  código: remetente de reação em modo PN (o `*Alt` é o `@lid` quando a mensagem vem por telefone →
  lado telefone do par + `learnPair` da própria reação; a mesma pessoa não duplica em grupo), mídia de
  tipo desconhecido COM arquivo no wwebjs volta a ser baixada (mantendo o `type` do describe), teto do
  reply-rate (`LEAST` só quando a linha nasceu depois do cold); testes: spec da engine wwebjs novo,
  lottie com spy (mutante morto), casos PN, reply-rate por EventBus (I, J) e caso K (mutante do teto
  morto), fora-de-ordem determinístico, CASE do chatJid no sentido inverso; docs: como voltar a
  receber reação com o Trigger 0.4.1 sem quebrar o fluxo (a orientação anterior quebraria),
  interações que deixam de contar no reply-rate, nota de rollback do deploy G, comentários do
  contrato, lista do dono completa; P-075 (reupload de mídia nunca dispara — pré-existente).

## Provas (25/09, local — macOS, Node 26.0.0, Postgres 18 de dev)

- `npm run lint` · `npm run format:check` · `npm run depcruise` (228 módulos, 0 violação) ·
  `npx tsc --noEmit -p apps/gateway/tsconfig.json` · `npm run gateway:build` · `npm run dashboard:build`
  · guardas de build (`patches`, `dist`, `deps`, `prisma`) · `node scripts/mapa-codigo.mjs --check` — verdes.
- `npm run test` — **48 arquivos, 477/477** (eram 360 na E4).
- Falham com o código antigo: e2e `conversas-reacoes` com o reply-rate e o módulo da HEAD → 7/11
  falhas; `baileys.inbound.spec.ts` com a `baileys.engine.ts` da HEAD → 7/7; mutante do download do
  lottie (passar `m`) → 1 falha; mutante do teto (`LEAST` puro) → `responded` 7 ≠ 6.
- `describeBaileysMessage` real sobre os 116 fixtures do catálogo (os 95 campos de `proto.Message`),
  pelo fio e por `fromObject` — mesmo resultado nos dois caminhos (`scratchpad/e22/baileys-tipos/describe-real.out`).
- Migration `20260925203458_reacoes_encaminhada` aplicada só no banco de dev (`migrate dev`);
  `ADD COLUMN` com default constante sem reescrita da tabela (doc do PG 18 + PoC de 2M linhas em 8,3 ms
  num cluster descartável).

- **CI do PR #7 (run 36203225481, `98e8fea`+`80bef35`, amd64):** `ci` 3m03s ✅ (format, depcruise,
  suíte com coverage contra Postgres/Redis/MinIO) · `imagens` 2m39s ✅ (build das 2 imagens + boot do
  gateway com a migration nova até o `/health`). `advisories` não rodou (lockfile inalterado).

### Reconciliação documental — R3/R9

- Payload do webhook `message`/`message.reaction`, `GET /messages`, `/search`, feed, tabelas e
  reply-rate mudaram → INTEGRACAO (§3 catálogo + §3.2 nova + lista do que conferir nos fluxos n8n;
  `message.ack` corrigido; §4; §12; §13), `packages/contracts` (mesmo commit), DECISOES (D-028),
  ARQUITETURA (tabela `wa_message_reactions` do messaging, `ReactionPersister`), MAPA-CODIGO (§3.2,
  §4.2 arquivos/fluxos/dados/invariantes, §4.3 relações, testes, §5 P-066/P-072..P-074, §5.1 P-047),
  PENDENCIAS (P-066 ✅, P-072 parte gateway ✅ + 7 achados para a E23, P-073, P-074, P-075), ESTADO,
  SESSOES (aviso + histórico), ROTEIRO (E22 ✅, diário, mensagem da E23), CHANGELOG,
  `how-to/rollback-gateway.md` (rollback do deploy G com enforce), `env.example`/`env.production.example`
  (retenção inclui reações), mapa gerado.
- **Docs-n/a:** CLAUDE.md/AGENTS.md (stack e comandos iguais), `deploy-a-onda1.md` (Onda 1, não muda),
  AUDITORIAS (nenhuma auditoria da agenda).
- **Fora do repo (do dono):** a skill local `conexozenvo-n8n-node` ainda diz que reação dispara
  handoff e lista `other` — ajustar quando quiser (não é versionada aqui).

### Checkpoint

- **O QUE FOI FEITO:** conteúdo fiel nas duas engines (funções puras + formatadores comuns), reação
  fora do `message` em tabela própria com lápide e guarda de horário, reply-rate com 3 ramos de
  reação no mesmo deploy, selo "Encaminhada", `reactions[]` no `GET /messages`/`/search`, `status` no
  feed, remetente/LID da reação corrigidos (modo LID e PN), wwebjs defensivo contra `$1`, backfill com
  a mesma descrição, `WEBHOOK_EVENTS` com ack/reação; P-072: achados de ACK para a E23.
- **PACOTES:** nenhum (Baileys rc14 e wwebjs 1.34.7 seguem os mais novos publicados — passo 0).
- **DECISÕES REGISTRADAS:** D-028 (reação não é mensagem + reply-rate; tipos novos; voto do contato
  = `poll_vote`; limiar "com frequência" ≥ 5 como inferência da FAQ; o que deixa de contar).
- **EFEITO DE DEPLOY (deploy G, fim da Onda 8):** migration aditiva (instantânea); o n8n deixa de
  receber reação no `message` (só `message.reaction`) e passa a receber tipos novos com texto;
  reação não muda o semáforo nem pausa a IA; reply-rate conta reação (e deixa de contar fixar/RSVP/
  ligação); `GET /messages`/feed com campos novos (aditivos). Rollback com enforce: ver
  `how-to/rollback-gateway.md` §2.
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** reação sumir do reply-rate (quarentena falsa) → e2e com 11
  casos, 2 pelo caminho de produção (EventBus → persister → SQL); tipo visível virar "…" ou reação
  virar mensagem → specs das funções puras pelo caminho do fio + specs das engines que falham com a
  HEAD; `*Alt` no sentido errado → casos PN e LID; contrato → contracts + INTEGRACAO no mesmo commit.

## BLOQUEADO EM VOCÊ

- **Deploy A (Onda 1) continua pendente** — [how-to/deploy-a-onda1.md](../how-to/deploy-a-onda1.md)
  §1–§2; depois o B-004 (§3).
- **Não mergear o PR da Onda 8 agora**: ele cresce com E23–E25 e o merge (= deploy G) é no fim da onda.
- **Antes do deploy G — seus fluxos n8n** (lista completa na INTEGRACAO §3.2): `GET /api/webhooks` em
  produção → marcar os que assinam só `["message"]`, os do Trigger (URL `…/webhook/<id>/webhook`) e
  URLs com mais de um cadastro; decidir como cada fluxo recebe reação (Trigger em "All Events" +
  Switch por evento, ou webhook próprio num nó Webhook separado — **nunca** na URL do Trigger).
- **Confirmar (ou vetar) as escolhas da D-028:** voto do contato como `poll_vote` contando no
  reply-rate; tipos novos no lugar de `other`.
- **Abertura da E23:** decidir se a P-074 (remetente de mensagem de grupo) entra nela.
- **Opcional, só leitura, quando quiser:** SQL do diagnóstico §3 (tipos em `wa_messages` nos últimos
  7 dias) e, para a P-072 item 2, mandar 1 mensagem de teste pelo celular numa conversa 1:1 e olhar o
  `status` dela em `wa_messages` depois de entregue.

## DOCS TOCADAS

`CHANGELOG.md` · `docs/ESTADO.md` · `docs/SESSOES.md` · `docs/PENDENCIAS.md` · `docs/DECISOES.md` ·
`docs/INTEGRACAO.md` · `docs/MAPA-CODIGO.md` · `docs/ARQUITETURA.md` · `docs/ROTEIRO-ONDAS-2026-09.md`
· `docs/how-to/rollback-gateway.md` · `apps/gateway/env.example` · `apps/gateway/env.production.example`
· `docs/reference/mapa-codigo/*` (gerado) · esta sessão.
