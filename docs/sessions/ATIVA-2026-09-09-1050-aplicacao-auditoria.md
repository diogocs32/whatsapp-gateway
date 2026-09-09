# Sessão: aplicacao-auditoria

- **Status:** 🟢 ATIVA — código entregue na branch; aguarda decisão do dono (merge + deploy)
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
