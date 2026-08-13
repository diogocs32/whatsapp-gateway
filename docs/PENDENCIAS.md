# 📌 PENDÊNCIAS — ConexoZenvo

> Quadro central (R9 · v4.3). Toda pendência descoberta em sessão entra AQUI na
> hora (não fica só no DONE-). Bloqueio que depende do dono/terceiro é B-xxx e
> vive no topo; pendência técnica é P-xxx e qualquer sessão pode assumir.
> Criado em 12/08/2026 (sessão `adocao-base-v43`), semeado com as pendências
> vivas do ESTADO.md e dos DONE- recentes.

## 🚧 BLOQUEADO EM MIM OU EM TERCEIRO (B-xxx — só o dono resolve)

### B-001 · 🔴 aberto · pedido em 22/07 (sessão hardening-antiban)

- **Ação:** concluir a migração para proxy RESIDENCIAL BR: importar os 20 IPs
  Webshare static residential em massa no painel (`user:pass@ip:porta`, source
  MANUAL), atribuir 1 IP/sessão (Proxy fixo), ligar `WA_REQUIRE_PROXY=true` no
  Dokploy e re-vincular as sessões.
- **Quem:** Diogo (ação operacional no painel + Dokploy — R0).
- **O que bloqueia:** eficácia do hardening anti-flag entregue em 22/07 (o código
  está em produção, mas sem proxy residencial + guard ligado a proteção é parcial).
- **Pronto esperando:** fingerprint por sessão, log de conexão sem proxy e o guard
  `WA_REQUIRE_PROXY` (default false) — tudo em produção desde 22/07.
- **Devolver:** responder "B-001 feito" com a data em que `WA_REQUIRE_PROXY=true`
  entrou no Dokploy (vira registro em DECISOES.md).
- **Contorno em vigor:** `WA_REQUIRE_PROXY=false` (default seguro reverso — sessão
  conecta sem proxy e só LOGA) → removido por [P-002] ao desbloquear.

### B-002 · 🔴 aberto · pedido em 12/08 (sessão wwebjs-w1-estabilidade)

- **Ação:** revalidar e **pinar uma `WWEBJS_WEB_VERSION` válida** no Dokploy (env do
  gateway) — a atual (`2.3000.1042271047-alpha`) expira ~fim de agosto/2026. Escolher
  uma versão nova em `github.com/wppconnect-team/wa-version` que **ainda exponha o
  número dos participantes** (builds novas escondem o PN no rollout LID) e confirmar
  numa extração de leads real antes de fixar.
- **Quem:** Diogo (ação operacional no Dokploy — R0).
- **O que bloqueia:** uso intenso do wwebjs "nos próximos dias" — se a versão expirar
  durante o uso, o fallback `live` degrada a extração de leads (perde o número).
- **Pronto esperando:** o código já tem fallback (`handleInitFailure` tenta `live` +
  WARN) e aceita `auto`/versão fixa por env — falta só a decisão da versão a fixar.
- **Devolver:** responder "B-002 feito" com a versão fixada e a data.
- **Contorno em vigor:** default fixo no código + retry `live` automático — segura a
  operação, mas com risco de LID-only; **não substitui** a revalidação.
- **Cenário em 12/08 (consulta ao `wa-version`):** o `currentVersion` é
  `2.3000.1045049472-alpha` e as builds atuais expiram **~12/10/2026** (2 meses). O
  default fixado no código (`2.3000.104227…`) é mais antigo e vence ~fim de agosto → o
  fallback `live` vai começar a agir em breve (com risco de esconder o PN).
- **Procedimento de revalidação (ordem):**
  1. Numa sessão wwebjs de teste, pinar um candidato em `WWEBJS_WEB_VERSION` (começar
     por uma build **próxima do default atual**, subindo aos poucos — as mais novas
     tendem a esconder o número).
  2. Rodar `GET /api/sessions/{s}/groups/{groupId}/leads` num grupo real e conferir se
     os leads ainda vêm com `phone` preenchido (PN exposto).
  3. Fixar no Dokploy a **build mais nova que AINDA expõe o PN** e que dê a maior janela
     até expirar. Evitar `auto`/`live` (trazem a mais nova = risco de LID-only).
  4. Anotar a versão + data aqui e responder "B-002 feito".

## 📋 Pendências técnicas (P-xxx — qualquer sessão assume)

| ID    | Pendência                                                                                                                                                | Origem                                   | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ |
| P-001 | Estabilidade de sessão P1/P2: watchdog de conexão, auto-heal DEGRADED, tratamento granular de DisconnectReason, reconexão wwebjs                          | DONE-2026-07-21-estabilidade (backlog)   | aberta |
| P-002 | Health-tester de proxies só testa ipify — não prova reputação junto ao WhatsApp; avaliar teste de reputação + remover contorno do B-001 quando resolvido | DONE-2026-07-22-hardening-antiban        | aberta |
| P-003 | Node n8n (repo `n8n-nodes-conexozenvo-gateway`): parâmetro `proxyId` opcional na criação de sessão + picker de `/proxies/available` (aditivo, minor)      | D-008                                    | aberta |
| P-004 | Lint local: `apps/gateway/auth/` nos ignores · normalizar Prettier · `format:check` no CI                                                                 | ESTADO.md § próximos passos (entra na M3) | aberta |
| P-005 | Job de purge de `refresh_tokens` expirados (índice em `expiresAt` já existe)                                                                              | D-009 (backlog)                          | aberta |
| P-006 | Ondas de adoção v4.3: A8 projeção `.claude/` · A9 gates de docs · A10 bateria única + catracas · A11 reorganização docs/ — plano em `ADOCAO.md`            | D-011 (sessão adocao-base-v43)           | aberta |
| P-007 | **wwebjs W1 (P0):** ✅ reconexão automática + fim do `start` no-op · ✅ guard `WA_REQUIRE_PROXY` no wwebjs · ✅ 1º teste da engine real (entregues 12/08, sessão `wwebjs-w1-estabilidade`). **RESTA (B/operacional):** revalidar/pinar `WWEBJS_WEB_VERSION` no Dokploy antes de expirar (~fim ago/2026) — P0-4 | analise-wwebjs-2026-08 (P0-1/2/4)        | parcial |
| ~~P-008~~ | ✅ **CONCLUÍDA 12/08** (sessão `wwebjs-w2-midia`): mídia inbound `downloadMedia`+S3 e outbound `mediaKey` · envelope de webhook com `engine` REAL (via `engineName` na IEngine) · `sendMediaAsDocument`/`Sticker` + guard de `sent` null | analise-wwebjs-2026-08 (P0-3, P1-1)      | ✅ |
| ~~P-009~~ | ✅ **CONCLUÍDA 12/08** (sessão `wwebjs-w3-ciclo-vida`): `purgeAuthDir` limpa o LocalAuth em disco no new-qr/logout/remove (fim do vazamento de perfil + new-qr recupera) · `destroy()` com teto · `qrBase64`/cache LID com teto no stop · `nope()`→HTTP 501 | analise-wwebjs-2026-08 (P1-2/3/6)        | ✅ |
| ~~P-010~~ | ✅ **CONCLUÍDA 12/08** (sessão `wwebjs-w4-superficie`): os 14 `nope()` implementados (grupos completos, checkNumbers, profilePicture, setBlock, canais beta) — paridade IEngine com o Baileys. **Residual movido p/ P-012** (recordHardSignal, dashboard por engine, anti-flag wwebjs, announce/restrict) | analise-wwebjs-2026-08 (P1-4/5, P2)      | ✅ |
| P-013 | **Formalizar em `packages/contracts` os campos da W5** (não tocados por conflito R9 com a sessão ativa `auth-refresh`): `mentions?: string[]` em `SendTextRequest` + tipo `SendReactionRequest { emoji }`. Hoje validados por zod + documentados em INTEGRACAO.md; formalizar quando `auth-refresh` fechar | sessão wwebjs-w5-mensagens-ricas          | aberta |
| P-012 | **wwebjs polimentos residuais:** ✅ `announce`/`restrict` reais (12/08, `p012-announce-restrict`) · ~~dashboard por engine~~ **OBSOLETO** · ✅ **anti-flag wwebjs** (12/08, `wwebjs-qualidade-max`): UA realista e estável POR SESSÃO (determinístico, paridade com o browser-fingerprint do Baileys) + `WWEBJS_USER_AGENT`/`WWEBJS_*` no zod + doc no env de prod. **RESTA:** `recordHardSignal` sem chamador (`signal.463`/`signal.restriction` = catálogo morto nas 2 engines — exige decisão de produto: fiar a sinal real × remover do contrato público com plano de versão R0) | analise-wwebjs-2026-08 (P1-5, P2)        | parcial |
| P-011 | **wwebjs recursos NOVOS (W5–W8, aditivo ao contrato):** ✅ W5/W5b (reações, menções, localização, poll) · ✅ W6 1º incremento (`message.reaction`) · ✅ W8 perfil próprio (status/nome/foto) · ✅ **W8 grupos avançados** (12/08, `wwebjs-qualidade-max`): membership requests (list/approve/reject c/ anti-flood), settings announce/restrict, foto de grupo — nas 2 engines. **RESTAM:** W6 (edit/revoke/vote_update/change_state/group_* — Baileys exige protocolMessage/decifrar) · W7 **backfill ✅ 1º incremento** (13/08, `wwebjs-w7-inbox`: `POST /messages/sync` puxa histórico da engine → banco, só WWEBJS/501 no Baileys; a leitura já existia) — **restam do W7:** gestão de chat (archive/pin/mute/markUnread) e `searchMessages` · canais completos (getSubscribers/transfer/delete) · vCard · reply/quote (Baileys sem `raw` inbound). Catálogo em `analise-wwebjs-2026-08.md` §7–§8 | analise-wwebjs-2026-08 parte 2           | aberta |
