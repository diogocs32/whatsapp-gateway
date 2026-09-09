# 📊 ESTADO GLOBAL — ConexoZenvo

> Fonte única de verdade do projeto. Atualizado SOMENTE no encerramento de sessão (R9).
> Ordem de leitura de toda conversa: 1º este arquivo → 2º [SESSOES.md](SESSOES.md) → 3º o arquivo da sessão ativa em [sessions/](sessions/).

- **Processo:** ondas M0–M6 definidas em [`DOCUMENTO_CONEXOZENVO_NESTJS.md`](../DOCUMENTO_CONEXOZENVO_NESTJS.md) (raiz)
- **Onda atual:** M3 · Qualidade — **CONCLUÍDA e EM PRODUÇÃO em 18/08/2026** (sessão `2026-08-18-0545-m3-qualidade`, D-018: fronteiras no CI + testes unitários de domínio + coverage; deploy ~11:50 UTC validado). Continuação incremental = P-022. (M2 concluída no mesmo dia — D-017.)
- **Próxima onda:** M4 · Segurança (backup testado — A1 segue a MAIS urgente —, rotação de secrets, npm audit no CI)

## Roadmap (R2)

| Onda | Objetivo                                                                             | Status        |
| ---- | ------------------------------------------------------------------------------------ | ------------- |
| M0   | Doc viva (ESTADO, SESSOES, DECISOES, ARQUITETURA, PROJETO, CHANGELOG, CLAUDE.md)     | ✅ 10/07/2026 |
| M1   | Destravar produção: O1–O3 operacionais + confirmar prod = código mais recente        | ✅ 10/07/2026 |
| M2   | Guard-rail ativo: observação G1–G8 → ligar `GUARDRAIL_ENFORCE`                       | ✅ 18/08/2026 |
| M3   | Qualidade: testes unitários de domínio + coverage + boundaries no CI                 | ✅ 18/08/2026 |
| M4   | Segurança: backup testado, rotação de secrets, npm audit no CI                       | ⬜            |
| M5   | Observabilidade com alertas (canal único + uptime externo)                           | ⬜            |
| M6   | Roadmaps estratégicos: ENGINE META CLOUD → multi-tenant RLS → multi-engine → /api/v1 | ⬜            |

## Estado de produção

> **31/08/2026:** produção AGORA roda no Dokploy novo (VPS 89.116.73.121, projeto `conexozenvo`, app `gateway`; `api.conexozenvo.cloud` vivo e `api.conexozenvo.com` reapontado via DNS). MinIO criado (bucket `wa-media`) → `checks.storage=true`. Deploy da sessão `envio-sem-onwhatsapp` (main `66b7076`) validado ~20:45 UTC — envio Baileys sem consulta de existência (`resolveJid` local). Detalhe: `sessions/DONE-2026-08-31-1730-envio-sem-onwhatsapp.md`.

> **09/09/2026 16:41 UTC (sessão `aplicacao-auditoria`):** as ondas A–H da auditoria 09/2026 estão **EM PRODUÇÃO** — PR #1, CI verde, merge ff `2836c65`, container `7192ca1ec8cd` healthy às 16:41:47. Validado na mesma conversa: migration `20260909150000_send_intents_reserva_campanha` aplicada no boot; reidratação escalonada de 20 sessões em ~3 min com as 5 que estavam WORKING antes (contato11, contato20, Diogo, contato1, contato2) de volta a WORKING; contato20 (a "presa" da P-025) subiu após 1 retentativa de init em 24 s; sessão nova `ddd` pareou por QR em ~30 s; logout de 14 sessões presas/em QR em <0,5 s cada; `POST /webhooks` e `/messages/media-url` com destino privado → 400 (egress); cookie/authorization redigidos no log. Detalhe: `sessions/DONE-2026-09-09-1050-aplicacao-auditoria.md`.
>
> **09/09/2026 17:27 UTC (sessão `logs-sem-erro-batido`):** correção da regressão P-041 + "logs sem erro batido" (P-042) **EM PRODUÇÃO** — CI verde, merge ff `4af6f9b`, container `a226fb2dffdf` healthy 17:27:05. Validado na mesma conversa: `request completed` com `statusCode` em 28/28 requisições (0 nulos, era 100% null); 4xx viram linha `http <status> <método> <rota>: <motivo>` com sessão e `code`; `syncAddressBook falhou` agora traz mensagem + stack (era `e={}`); 0 linhas de console (dump do libsignal sumiu); egress 400 e redação de cookie reconfirmados. Reidratou as 6 sessões WORKING de antes; contato2 caiu em SCAN_QR (creds mortas, precisa reparear — pré-existente) e Diogo (Baileys) enviou normalmente mas o status persistido ficou STOPPED com erro vazio (sync de status a investigar, sem impacto funcional). Detalhe: `sessions/DONE-2026-09-09-1400-logs-sem-erro-batido.md`.

> **09/09/2026 18:15 UTC (sessão `baileys-shutdown`):** `BaileysEngine.shutdown()` (P-043) **EM PRODUÇÃO** — CI verde (run 34387489755), merge ff `301d42d`, container `047606fd42a3` healthy 18:15:29. Diogo (Baileys) reidratou às 18:15:21 e ficou **WORKING** com status limpo (18:15:30, erro vazio) — sem intervenção manual. Ressalva: este deploy aposentou o container `a226fb2dffdf` que AINDA era o sem correção (encerrou 18:15:29); desta vez o WORKING do container novo ganhou a corrida por 1 s, mas foi sorte de timing. A prova cabal vem no PRÓXIMO deploy, quando o container que sai já tiver o `shutdown()` e não gravar STOPPED. Frota: contato20/contato1/ddd WORKING; contato11 em SCAN_QR (creds mortas, reparear — pré-existente); as 14 deslogadas pelo dono seguem STOPPED.

- **Em produção:** conexozenvo.com (painel) + api.conexozenvo.com (API) no Dokploy (Docker Swarm)
- **Último deploy confirmado:** 09/09/2026 **18:15 UTC** — `301d42d` (Baileys `shutdown()`, P-043), ver nota acima. Anteriores: 09/09 17:27 `4af6f9b` (logs) · 09/09 16:41 `2836c65` (auditoria) · 31/08 `66b7076`.
- **Deploy da onda M3:** 18/08/2026 **~11:50 UTC** (merge ff
  `4ea1c75` → push 11:47:25 → auto-deploy → container novo **11:50:26** healthy, ciclo ~3min).
  Validação: `/health` ok com uptime resetado e estável (19s→118s, database/redis/storage true,
  memória ~13%) · dashboard HTTP 200 · **CI novo passou na 1ª execução real** (run 32133482842,
  success em 4m36s — format:check + depcruise + suíte com coverage). Zero mudança de
  comportamento de runtime (M3 = tooling/testes); frota 100% Baileys (sem custo D-014).
  Conferência do dono (opcional): log de boot no Dokploy — reconexão da frota escalonada.
- **Deploy anterior:** 16/08/2026 **~23:43 UTC** — gateway no `d172b78` (auto-deploy do
  hotfix do Dockerfile; boot validado: Nest started, migration `indice_wa_contacts_phone` aplicada,
  1ª sessão Baileys conectada no **rc14** com pre-keys + LID, zero "Falha ao reidratar") e
  dashboard no `c96940c` (~22:11 UTC, Deploy manual — code-splitting + gzip_vary validados por
  fora). Cadeia do dia 16/08: ~17:50 Deploy manual `d75eab3` (**ativa P-019 watchdog + P-020
  dedup**) → ~22:11 Deploy manual `c96940c` nos 2 apps (dashboard OK; gateway Exited(1) por
  `Cannot find module 'zod'` — zod aninhado fora da imagem; Swarm segurou o antigo, SEM outage;
  migration ficou aplicada) → 23:36 push `d172b78` fix → auto-deploy → **23:43 container novo
  healthy**. Watch Paths "Teste 2" ✅ (código no topo → deploya). Deps agora em prod: NestJS
  11.2.1 · Prisma 7.9.1 · fastify 5.11.3 · **Baileys rc14** · pino 10 · BullMQ 5.81.3 (D-016).

- **Auditoria 07/2026: 100% ENCERRADA** — código (itens 3–26) e operacionais (O1–O4) todos ✅; detalhes em [auditoria-2026-07.md](auditoria-2026-07.md)
- **Proxies:** pool Webshare re-sincronizado (10/07), todos ALIVE de verdade (health-tester só aceita 2xx), sessões WORKING
- **DNS:** validado verde no Dokploy (10/07)
- **Guard-rail G1–G8:** implementado e **ATIVO em produção** (`GUARDRAIL_ENFORCE=true`, ligado pelo dono ≤13/08 — M2 concluída 18/08, D-017; rollback: `=false` + redeploy, funciona desde o D-007)
- **Node n8n** `n8n-nodes-conexozenvo-gateway`: publicado no npm (v0.4.1) — repo separado; o contrato `/api` atual é a v1 de fato (R0/R4)
- **Webhook de deploy do Dokploy:** intermitente no histórico (2 falhas em 03/07), mas disparou normal nos 2 pushes de 10/07 (~4,5 min de ciclo) — seguir observando
- **Watch Paths (13/08):** configurado nos 2 apps (gateway + dashboard) para NÃO redeployar em commit só de `docs/` — lista de inclusão `apps/<app>/**` + `packages/contracts/**` + `package.json` + `package-lock.json`. **Teste 1 OK** (push doc-only `cca541a` não gerou build em nenhum app). Teste 2 (código deploya) valida no próximo push de código real. Runbook: [how-to/dokploy-watch-paths.md](how-to/dokploy-watch-paths.md).
- **Push 13/08 (origin/main = `9cb5686`):** todas as ondas wwebjs (W1–W8 + qualidade/desempenho MAX) e a base v4.3 estão no remoto e **em produção** — deploy confirmado pelo `/health` (ver "Último deploy"). Resta só o smoke funcional (runbook [how-to/smoke-test-wwebjs-w8-qualidade.md](how-to/smoke-test-wwebjs-w8-qualidade.md)).

## Divergência dev × produção

| Onde                                 | O quê                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| feature/auditoria-melhorias-20260909 | **NÃO deployada** — 7 commits de código (ondas A–G da auditoria 09/2026) + docs. Base `b982d10`. Exige `EGRESS_ALLOW_HOSTS` se houver webhook interno; migration aditiva `20260909150000`. Ver checkpoint da sessão `aplicacao-auditoria`                                                                                                                                                               |
| main local ↔ origin/main             | **Sincronizado e PRODUÇÃO = MAIN** (`4ea1c75`, deploy 18/08 ~11:50 UTC — onda M3 ativa: CI com format/fronteiras/coverage, 28 testes unitários, tudo de 16/08 preservado). Nada pendente de deploy.                                                                                                                                                                                                     |
| ~~feature/m3-qualidade~~             | ✅ **EM PRODUÇÃO 18/08 ~11:50 UTC** (merge ff `4ea1c75`; CI novo success na 1ª execução; branch deletada pós-merge). Onda M3 concluída — continuação = P-022                                                                                                                                                                                                                                            |
| ~~feature/dedup-status-alertas~~     | ✅ **EM PRODUÇÃO 16/08** (P-020/D-015, deploy ~17:50 UTC): dedup de `session.status` idêntico consecutivo — fim do spam de alerta zap/telegram                                                                                                                                                                                                                                                          |
| ~~feature/otimizacao-deps-hotpaths~~ | ✅ **EM PRODUÇÃO 16/08 ~23:43 UTC** (D-016): deps atualizadas (NestJS 11.2.1, Prisma 7.9.1, fastify 5.11.3, Baileys rc14, pino 10, BullMQ 5.81.3) + otimizações (pool pg, recordMany em lote, ACK atômico, WEBHOOK_CONCURRENCY, teto de mídia, índice wa_contacts, code-splitting). Precisou de hotfix `d172b78` (zod aninhado fora da imagem — ver adendo no DONE da sessão). Majors deferidos → P-021 |
| ~~feature/wwebjs-store-travado~~     | ✅ **MERGEADA E EM PROD desde 13–14/08** (`3e74d25`/`4e30159`/`0e89017` — teto/probe, pin wwebjs `1780711` D-012, groupInfo sem getContacts + auto-heal; P-014 validado 14/08). Sessão encerrada 18/08                                                                                                                                                                                                  |
| ~~feature/m2-guardrail-ativo~~       | ✅ **MERGEADA (doc-only) 18/08** (`71d839f` — coletas da janela + teste 423 aprovado). **Onda M2 concluída (D-017)**; a divergência do `GUARDRAIL_ENFORCE` foi RECONCILIADA: `true` é o estado oficial                                                                                                                                                                                                  |
| ~~feature/auth-refresh-rotation~~    | ✅ **EM PROD desde 19/07** (`ce204d1` — refresh-token rotation D-009, fim do 401 de 12h). Sessão encerrada 18/08 (a branch já nem existia)                                                                                                                                                                                                                                                              |

## Pendências operacionais

Nenhuma — O1–O4 concluídos. Observação contínua: intermitência do webhook de deploy do Dokploy (se um push não deployar em ~5 min: GitHub → Settings → Webhooks → Recent Deliveries + Deploy manual).

## Backlog de produto (fora das ondas — vira sessão R9 própria quando priorizado)

- ✅ **ENTREGUE 11/07/2026 — Escolha de proxy livre na criação de sessão** (D-008, sessão
  `2026-07-11-1753-proxy-na-criacao`): `GET /api/proxies/available` + `proxyId` opcional no
  `POST /sessions` (SINGLE/STICKY exclusivo, 1 proxy = 1 sessão) + dropdown no painel. Pendência
  residual (repo do node n8n): parâmetro `proxyId` opcional na operação de criar sessão.

## Processo (atualizado em 12/08 — D-011)

Base universal **v4.3** adotada (upgrade da v3.2 — D-010/D-011): regras canônicas em
`BASE_CONEXOZENVO.md` (raiz, R0–R21). Novidades v4.3 EM VIGOR: abertura de sessão lê
também [PENDENCIAS.md](PENDENCIAS.md) (quadro P-xxx/B-xxx) e preenche ECO DE LEITURA;
SESSOES.md tem seção 📢 Avisos; encerramento faz reconciliação documental (mapa de
gatilhos do R3); checkpoint ganhou BLOQUEADO EM VOCÊ + DOCS TOCADAS. Navegação em
[MAPA.md](MAPA.md); auditorias em [AUDITORIAS.md](AUDITORIAS.md); ondas de adoção
**A1–A7** (v3.2) + **A8–A11** (v4.3: projeção `.claude/`, gates de docs, bateria
única + varredura, reorganização docs/) em [ADOCAO.md](ADOCAO.md) — A1 backup segue
sendo a mais urgente: produção SEM backup do banco.

## Próximos passos

0. ✅ **P-019 + P-020 + D-016 ATIVADOS 16/08** (deploys de ~17:50 e ~23:43 UTC — ver "Último
   deploy"). Ações do dono que RESTAM: pausar/desligar autostart das Baileys não-pareadas (P-018,
   painel), rotacionar a `X-Api-Key` (exposta 2× em chat) e tirar `Webshare 20 proxies.txt` da
   raiz. Revalidar a build do WA Web ~início out/2026 (expira 13/10 — B-002). **Sessão wwebjs:
   REMOVIDA da frota no fim de 14/08** (frota atual = 18 Baileys); recriar quando precisar de
   leads (1 QR; bootstrap sempre completa).
1. ✅ **M2 CONCLUÍDA 18/08** (D-017): enforce ativo em prod desde ≤13/08, janela + teste 423 aprovados, docs mergeados (`71d839f`). Próxima onda de trabalho = **M3** (item 2)
   1b. **Estabilidade de sessão — P0 ENTREGUE 21/07** (sessão `DONE-2026-07-21-1730-estabilidade-sessoes`): mutex Baileys · creds limpas no loggedOut · `POST /:id/new-qr` + botão do painel · 401 → /login. Restam P1/P2 (watchdog, auto-heal DEGRADED, DisconnectReason, reconexão wwebjs — backlog no arquivo DONE da sessão; vira sessão nova quando priorizado)
   1c. **Anti-flag de sessão — CÓDIGO ENTREGUE 22/07** (sessão `DONE-2026-07-22-1700-hardening-antiban`): fingerprint realista por sessão · log de conexão sem proxy · `WA_REQUIRE_PROXY` (default false). Diagnóstico: proxies eram Webshare DATACENTER (`mode=direct`) — flag na conexão. **AÇÃO OPERACIONAL do usuário (em curso):** migrar p/ proxy RESIDENCIAL BR (adquirido — Webshare static residential, 20 IPs SP), importar em massa (`user:pass@ip:porta`, source MANUAL), atribuir 1 IP/sessão (Proxy fixo), ligar `WA_REQUIRE_PROXY=true` no Dokploy, re-vincular. Backlog: health-tester só testa ipify (não prova reputação WhatsApp).
   1d. **Adoção A1 (backup)** → A2 (gates) → A3 (fuso) · da v4.3: A8 (`.claude/`) →
   A9 (gates de docs) → A10 (bateria única + varredura) — ver [ADOCAO.md](ADOCAO.md);
   pendências e bloqueios agora centralizados em [PENDENCIAS.md](PENDENCIAS.md)
   (B-001 = migração proxy residencial, em curso com o usuário)
   1e. **Motor wwebjs — ANÁLISE ENTREGUE 12/08** (`analise-wwebjs-2026-08.md`): 3 defeitos P0, 12/28 métodos `nope()`, zero e2e, webVersion a semanas de expirar. Plano em ondas (P-007 W1 → P-008 W2 mídia → P-009 W3 ciclo de vida → P-010 W4 superfície → P-011 W5–W8 recursos novos).
   1s. **wwebjs W7 busca — ENTREGUE 13/08 (FECHA O W7)** (sessão `DONE-…-0810-wwebjs-w7c-search`, P-011): `GET /api/sessions/{s}/messages/search?q=termo` (opcional `&chatId=&limit=`) busca no banco (`wa_messages.text`, ILIKE) — **agnóstica de engine** (funciona no Baileys), alcança o histórico do backfill. Mergeado na main local, **NÃO pushado**. **W7 COMPLETO:** backfill + gestão de chat + busca. Do plano wwebjs (analise-wwebjs) resta recurso novo diverso (W6 restante, canais completos, vCard, reply/quote) + P-012 `recordHardSignal`.
   1r. **wwebjs W7 gestão de chat — ENTREGUE 13/08** (sessão `DONE-…-0744-wwebjs-w7b-chat-mgmt`, P-011): `setChatFlag` (arquivar/fixar/silenciar/marcar não-lido) via `POST /api/sessions/{s}/messages/{chatId}/flag` `{flag, enabled}` — só WWEBJS, **501** no Baileys (archive/markRead exigem app-state sync). Idempotente. Mergeado na main local, **NÃO pushado**. **Fecha o W7 exceto `searchMessages`.**
   1q. **wwebjs W7 inbox (recurso NOVO) — 1º incremento ENTREGUE 13/08** (sessão `DONE-…-0726-wwebjs-w7-inbox`, P-011): **backfill de histórico**. Descoberta: a inbox de LEITURA já existia (banco `wa_messages`, agnóstica de engine). O W7 é POPULAR: `POST /api/sessions/{s}/messages/sync` (`{chatId?, limit?, maxChats?}`) puxa o histórico da engine (`getChats`/`fetchMessages` no wwebjs; **501** no Baileys) e grava direto no banco (dedup por keyId, **sem** EventBus → não dispara webhook/reply-rate). Mídia histórica sem binário. Mergeado na main local, **NÃO pushado**. Restam do W7: gestão de chat (archive/pin/mute) + `searchMessages`. Contracts→P-013.
   1p. **wwebjs qualidade/desempenho MAX — ENTREGUE 12/08** (sessão `DONE-…-2043-wwebjs-qualidade-max`): **desempenho** — extração de leads em LOTE (round-trips CDP O(N)→O(N/50): `getContacts` 1× + `getContactLidAndPhone` em blocos de 50; grupo grande volta em segundos). **Correções** — presença global `available`/`unavailable` real (antes mentiam `ok`), `requestPairingCode`→`PAIRING_CODE` + listeners `code`/`change_state` (diagnóstico de queda), guard de Chromium ausente, higiene (clearTimeout/cache/early-return). **Anti-flag** — UA realista e estável POR SESSÃO + `WWEBJS_*` no zod (**fecha a parte de UA da P-012**; resta só `recordHardSignal` morto). **Recurso NOVO (W8, 2 engines, aditivo R0)** — administração de grupo: `GET/POST …/groups/:g/membership-requests` (fila + approve/reject com anti-flood), `POST …/settings` (announce/restrict), `POST …/photo` (por URL). Pushado 13/08 (deploy disparado). Contracts→P-013.
   1o. **wwebjs P-012 (correção) — announce/restrict reais 12/08** (sessão `DONE-…-1959-wwebjs-p012-announce-restrict`): grupos do wwebjs devolvem `announce`/`restrict` REAIS (era `false` fixo). Item "dashboard por engine" da P-012 virou obsoleto (W4). Pushado 13/08 (deploy disparado). Resta da P-012: `recordHardSignal` morto (o anti-flag/UA do wwebjs foi entregue na sessão qualidade-max, item 1p).
   1n. **wwebjs W8 (recurso NOVO) — ENTREGUE 12/08** (sessões `DONE-…-1941-wwebjs-w8-perfil-conta` e `DONE-…-1947-wwebjs-w8b-foto-perfil`): **perfil da conta completo** — `POST /profile/status`, `/profile/name` e `/profile/photo` nas 2 engines, aditivo. Pushado 13/08 (deploy disparado). Membership requests e admin-only toggles ENTREGUES na sessão qualidade-max (item 1p); resta de recurso novo o W7 inbox (assimétrico).
   1m. **PUSH de TODAS as ondas wwebjs FEITO 13/08** (origin/main = `3f7c611`): W1–W8 + qualidade/desempenho MAX (item 1p) + base v4.3 no remoto — **deploy disparado, aguardando confirmação operacional**. **Checklist de validação em produção:** [how-to/smoke-test-wwebjs-w1-w6.md](how-to/smoke-test-wwebjs-w1-w6.md) (prova de deploy, smoke por onda, rollback, B-001/B-002). O push reinicia o gateway (R0) — se havia sessão wwebjs real conectada, conferir se voltou (reconexão automática da W1; senão `POST /restart`).
   1l. **wwebjs W6 (recurso NOVO) — 1º incremento ENTREGUE 12/08** (sessão `DONE-2026-08-12-1921-wwebjs-w6-webhook-reacoes`): webhook mais rico — evento **`message.reaction`** (reações recebidas) nas 2 engines, aditivo. Pushado 13/08 (deploy disparado). Restam do W6: edição, revogação, votos (`vote_update`), `change_state`, `group_*` (deferidos — Baileys exige protocolMessage/decifrar).
   1k. **wwebjs W5b (recurso NOVO) — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1902-wwebjs-w5b-location-poll`): **enviar localização** (`POST /messages/location`) e **enviar enquete** (`POST /messages/poll`) nas 2 engines, aditivo. Pushado 13/08 (deploy disparado). Deferidos com motivo: reply/quote (Baileys sem `raw` inbound), captura de votos, vCard.
   1j. **wwebjs W5 (recurso NOVO) — 1º incremento ENTREGUE 12/08** (sessão `DONE-2026-08-12-1746-wwebjs-w5-mensagens-ricas`): **reações** (`POST /messages/:msgId/reaction`) e **menções** (`mentions[]` em text/media-url) nas DUAS engines, aditivo (R0). Pushado 13/08 (deploy disparado). Restam do W5: reply/quote, poll+vote_update, localização, vCard (P-011); formalizar contracts = P-013 (bloqueado por R9 na sessão auth-refresh).
   1i. **wwebjs W4 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1736-wwebjs-w4-superficie`, P-010 ✅): os 14 métodos antes "não suportados" (grupos completos, checkNumbers, profilePicture, setBlock, canais beta) IMPLEMENTADOS — **paridade IEngine wwebjs × Baileys**. Pushado 13/08 (deploy disparado). Do plano wwebjs resta só recurso NOVO (P-011 W5–W8) + polimentos (P-012).
   1h. **wwebjs W3 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1723-wwebjs-w3-ciclo-vida`, P-009 ✅): fim do vazamento de perfil Chromium no DELETE + `new-qr` recupera sessão wwebjs (limpa LocalAuth em disco) + `destroy` com teto + `qrBase64`/cache com teto + `nope()`→HTTP 501. Pushado 13/08 (deploy disparado). Próximo: W4 (implementar os 12 `nope()` — API existe na lib; P-010).
   1g. **wwebjs W2 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1715-wwebjs-w2-midia`, P-008 ✅): mídia no S3 nas duas direções (fim do 404 em `GET /media` para wwebjs) + envelope de webhook com a engine REAL (`engine:"wwebjs"`, antes tudo saía `baileys`) + `sendMediaAsDocument`/`Sticker` + guard de `sent` null. Pushado 13/08 (deploy disparado). Próximo: W3 (ciclo de vida — limpar LocalAuth no logout/new-qr/remove; P-009).
   1f. **wwebjs W1 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1702-wwebjs-w1-estabilidade`): reconexão automática + fim do `start` no-op + guard `WA_REQUIRE_PROXY` no wwebjs (fecha o vazamento de IP) + 1º teste da engine real. Pushado 13/08 (deploy disparado). **Restam ações operacionais do dono:** B-002 (revalidar `WWEBJS_WEB_VERSION` no Dokploy antes de expirar ~fim ago) e B-001 (proxy residencial por sessão — agora o `WA_REQUIRE_PROXY=true` protege o wwebjs de verdade). **Deploy R0:** o push reinicia o gateway — não fazer em rajada com sessão wwebjs real conectada.
2. ✅ **M3 CONCLUÍDA E EM PRODUÇÃO 18/08 ~11:50 UTC** (deploy validado + CI novo verde). Continuação incremental (mais testes de domínio, jobId sem `:` por teste, threshold de coverage) = **P-022**. Próxima onda de trabalho = **M4 · Segurança** (A1 backup é a mais urgente — produção SEM backup do banco)
3. Node n8n (repo separado): parâmetro `proxyId` na criação de sessão (D-008)
