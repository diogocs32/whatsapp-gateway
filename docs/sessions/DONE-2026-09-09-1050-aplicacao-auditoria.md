# Sessão: aplicacao-auditoria

- **Status:** ✅ ENCERRADA 09/09 — mergeada (PR #1, `2836c65`) e **validada em produção** (16:41 UTC); ver "Validação em produção" no fim
- **Início:** 09/09/2026 10:50 (BRT)
- **Objetivo:** aplicar as recomendações de `docs/auditoria-melhorias-2026-09.md` (61 achados,
  P-027..P-040) — o que é código concreto, de baixo risco e verificável — em ondas, com
  testes, sem quebrar o contrato `/api` (R0) nem produção.
- **Escopo (tocou):** `apps/gateway` (bootstrap, shared-kernel, iam, sessions/wwebjs+baileys,
  messaging, campaigns, webhooks, guardrail, observability, health, infra redis/prisma/storage),
  `packages/contracts` (aditivo), `apps/dashboard` (Inbox, Sessions, App, api, Campaigns),
  `.github/workflows/ci.yml`, deps (patches/minors), docs.
- **Fora do escopo (não tocado, por desenho):** META_CLOUD (M6), consentimento/supressão
  (CON-01..04 → P-027), escopos de API key/MFA, outbox durável, envelope encryption, ownership
  por sessão/réplicas, timestamptz, majors de deps (P-021), Fastify ≥5.12 (pin do Nest 11).
- **Branch:** `feature/auditoria-melhorias-20260909` (base `b982d10`).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO.md:** produção no Dokploy novo; deploy real = `740b911` (01/09 00:14 UTC) — ESTADO
  ainda dizia `66b7076`; reconciliado nesta sessão. Nada desta branch está em produção.
- **SESSOES.md:** `lid-envio-wwebjs` (alheia) segue ATIVA embora seu commit esteja na main e
  em prod — não toco. `diagnostico-nao-conecta` (minha, 07/09) encerrada aqui (DONE).
- **PENDENCIAS.md:** P-027..P-040 criadas pela auditoria; status atualizado por onda nesta
  sessão. B-003 (teste da build nova) continua no dono.
- **Travas:** TS 5.9.3 (override mantido) · wwebjs tarball `1780711` + patch (intocados) ·
  Baileys rc14 (intocado) · jobId sem `:` (campanhas: `campaign-<id>-<rid>`) · forward-only
  (1 migration nova, aditiva) · push na main = deploy stop-first (janela do dono).

## Entregue (commits na branch, em ordem)

| Onda | Commit    | Conteúdo                                                                                                                                                                                                                                                         |
| ---- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —    | `fbce82a` | Docs da auditoria (sessão anterior, sem código)                                                                                                                                                                                                                  |
| A    | `8f50861` | Redação de segredos no log · CSRF por cookie · revogação no reset/rebaixamento · senha 8..128 + scrypt versionado + tempo constante · `rediss://`/`DB_SSL_CA` · health com prazo · NoSuchKey→503 · clamp de limits · headers reservados/DLQ reservada · métricas |
| B    | `2940b12` | Teto no `initialize()` do wwebjs · watchdog de QR/pairing · callbacks por geração · WA-15 estado real · pairing code fora do log · idade da build · Baileys timer único + `cachedGroupMetadata`                                                                  |
| C    | `f271f63` | `wa_send_intents` (idempotência antes do transporte, 409 conflito/em voo) · campanhas: `firstContact` + gate, start atômico, reserva de destinatário, cap por dia local, resume · migration `20260909150000`                                                     |
| D    | `929a086` | `safe-fetch` (egress/SSRF + corpo em fluxo com teto) em webhook/campanha/media-url · `EGRESS_ALLOW_HOSTS`                                                                                                                                                        |
| E    | `e3aa80e` | Guard-rail: cooldown, quarentena manual, mediana zero/velha, Nmin único, CAS, catch→métrica, 401≠ban                                                                                                                                                             |
| F    | `5218332` | Painel: envio idempotente, respostas obsoletas, QR sem rajadas, diálogo acessível, ErrorBoundary/preloadError · CI: permissions, SHA, typecheck completo, audit informativo                                                                                      |
| G    | (G1/G2)   | Patches de segurança (sharp, fast-uri, js-yaml, vitest) e minors (Nest 11.2.3, Prisma 7.10, BullMQ, AWS SDK, tipos, Vite, RR, eslint)                                                                                                                            |
| H    | (docs)    | INTEGRACAO, env.example, PENDENCIAS, SESSOES, ESTADO, CHANGELOG, este arquivo                                                                                                                                                                                    |

**Validação por onda:** lint · prettier · depcruise (0 violações) · tsc gateway/dashboard/
contracts · unit (46 → 107 testes) · `vite build` · `prisma validate`. E2E novos (CSRF,
revogação, idempotência concorrente, egress no cadastro de webhook) rodam no CI (sem Docker
nesta máquina).

## ⚠️ Mudanças de comportamento que o dono precisa saber ANTES do deploy

1. **Egress estrito por default:** webhook/mediaUrl para host privado/loopback passam a ser
   recusados (cadastro 400; entrega → dead-letter). Se algum webhook aponta para n8n interno
   (Docker), definir `EGRESS_ALLOW_HOSTS` no Dokploy ANTES do deploy.
2. **CSRF por cookie:** só afeta quem usa o cookie do painel fora do painel (ex.: curl com o
   cookie). Integrações (`X-Api-Key`/Bearer) não mudam.
3. **Senha nova mínimo 8** (criar/resetar usuário). Login e senhas existentes não mudam
   (re-hash transparente no próximo login).
4. **`idempotencyKey` com payload diferente ou em voo → 409** (antes: reenviava). O node n8n
   deve tratar 409 como "não reenviar agora".
5. **Campanhas** (`/api/campaigns`, hoje sem uso em prod): `firstContact` default true → gate
   cold; `dailyCap` por dia local.
6. **Migration nova** (`wa_send_intents` + 3 colunas) — `migrate deploy` no boot, aditiva.
7. **wwebjs:** initialize com teto de 4 min (env) e watchdog de QR — sessões presas passam a
   FAILED com motivo em vez de ficarem "Iniciando" para sempre.

## BLOQUEADO EM VOCÊ

- Decidir merge (`feature/auditoria-melhorias-20260909` → main) e janela de deploy (stop-first
  reinicia a frota — R0). Conferir `EGRESS_ALLOW_HOSTS` antes. B-003 continua aberta.

## DOCS TOCADAS

- `docs/INTEGRACAO.md` (§1 CSRF/pairingCode, §2 409/egress, §3 egress de webhook, §5 campanhas
  e cooldown) · `apps/gateway/env.example` · `docs/PENDENCIAS.md` (P-025..P-040) ·
  `docs/SESSOES.md` · `docs/ESTADO.md` · `CHANGELOG.md` · `docs/sessions/DONE-2026-09-07-…` ·
  este arquivo.

## Validação em produção (09/09, 16:36–17:00 UTC — Dokploy 89.116.73.121, container `7192ca1ec8cd`)

- **Deploy:** "faça merge e push" → PR #1 → CI verde → merge ff `2836c65` (push 16:36 UTC) → auto-deploy → Nest de pé 16:41:29, healthy 16:41:47. Migration `20260909150000_send_intents_reserva_campanha` aplicada no boot. `/health` ok (database/redis/storage true) em `api.conexozenvo.cloud` e `api.conexozenvo.com`. O Dokploy antigo (187.77.248.160) também recebeu o push; o dono excluiu os apps de lá — só o 89.116.73.121 vale.
- **Reidratação:** 20 sessões escalonadas em ~3 min (16:41:29 → 16:44:31). As 5 WORKING pré-deploy (contato11, contato20, Diogo, contato1, contato2) voltaram WORKING. **contato20** (presa em STARTING desde 01/09 — P-025) falhou o 1º init às 16:42:23 (`wwebjs: falha ao inicializar` → retentativa com a MESMA build) e ficou WORKING às 16:42:47. Boot com 2 erros transitórios esperados (`stream errored out` do Baileys → reconectou; o init acima) e o WARN de perfil sem marca de fechamento limpo (P-015, diagnóstico).
- **Pareamento (B-003/P-026):** sessão nova `ddd` (WWEBJS) criada 16:48:17 → WORKING 16:48:47 (~30 s) e enviando mensagens — a build fixa atual pareia.
- **Logout (P-025):** o dono deslogou 14 sessões presas/em QR às 16:46:43–16:47:08 — 166–501 ms cada ("já vi que para fazer logout está muito mais rápido"). Elas ficaram STOPPED com `lastError` antigo ("reconectando (tentativa 1/5)") → cosmético, corrigido na sessão `logs-sem-erro-batido`.
- **Egress (P-031):** `POST /api/webhooks` com `127.0.0.1`, `169.254.169.254` e `https://user:pass@…` → **400** com motivo; `POST /messages/media-url` com `http://127.0.0.1:9/…` → **400** ("destino 127.0.0.1 é um endereço privado/reservado"). Webhooks reais (4, docta.cloud) não precisam de `EGRESS_ALLOW_HOSTS`.
- **Redação (P-032):** 28 requests com cookie no log → todos `[Redacted]`; `?token=` mascarado. **Achado:** `res.statusCode` = `null` em 47/47 `request completed` → P-041 (corrigida na branch seguinte).
- **Outros:** `/metrics` sem token recusado; `GET /sessions/:id/qr` devolve `{status, qr}` (`pairingCode` só quando solicitado); `limit` negativo/NaN clampado (200 com lista); guardrail config `{nmin 20, cooldown 48h, enforce true}`; retenção rodou no boot (`raw zerado em 2 mensagens antigas`); 123 dead-letters pendentes pré-existentes (inalteradas).
- **Não testado de propósito:** envio real de mensagem (replay/409 exige envio de verdade — coberto pelos e2e do CI); `POST /pairing-code` (efeito real no WhatsApp).
