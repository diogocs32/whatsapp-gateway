# 🚧 ADOÇÃO DO PADRÃO v3.2 — ConexoZenvo

> Diagnóstico + plano de ondas (R18 · modo UPGRADE, sessão
> `2026-07-21-1630-adocao-base-v32`, D-009). Arquivar quando o diagnóstico
> estiver 100% ✅/➖ e registrar em DECISOES.md.
> Evidências coletadas em 21/07/2026 por varredura do repo (arquivo:linha).

## Diagnóstico R0–R18

| Regra                | Status | Evidência                                                                                                                                                                            | Onda        |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| R0 Produção primeiro | ✅     | Praticado: checkpoints com "efeito de deploy", ações Dokploy descritas (ESTADO.md, sessions/)                                                                                          | —           |
| R1 Checkpoints       | ✅     | M0/M1 fechadas com checkpoint e OK; M2 em curso com coletas datadas                                                                                                                    | —           |
| R2 Ondas             | ✅     | Roadmap M0–M6 em ESTADO.md; status atualizado em encerramento                                                                                                                          | —           |
| R3 Doc viva          | 🟡     | ESTADO/SESSOES/DECISOES/ARQUITETURA/PROJETO/CHANGELOG ok; MAPA.md e AUDITORIAS.md criados AGORA; falta gate de integridade de links no CI                                              | A2          |
| R4 Versionamento     | 🟡     | Conventional commits pt-BR ok · forward-only ok (21 migrations) · contracts junto ok · **0 tags git**, tudo em 0.1.0 · N-1/expand-contract ainda não formalizado                       | A5          |
| R5 Segurança         | 🟡     | Forte: API key SHA-512 (`api-key.service.ts:26-29`), scrypt+timingSafeEqual (`crypto.ts:17,29`), JWT httpOnly (`auth.tsx:25`), rate limit (`main.ts:53-60`), helmet, HMAC sha512 (`webhook-queue.ts:92-100`), /metrics token, logs com redact · **AUSENTE: backup do banco (nenhuma rotina!)**, rotação de secrets com runbook, npm audit no CI | **A1**, A2  |
| R6 Qualidade         | 🟡     | CI: lint+typecheck(gateway)+e2e(16 arqs)+builds (`ci.yml:38-56`) · **AUSENTE: hooks pre-commit (nada em .husky/), coverage, unit tests, gitleaks, gate de drift env, boundaries, typecheck do dashboard, script `check` agregado** | A2, A4      |
| R7 Monitoramento     | 🟡     | pino JSON com redact (`app.module.ts:31-54`), /health rico (db/redis/storage/memória, 503), prom-client · **AUSENTE: Sentry, uptime externo, canal de alertas** (código) — notificador guard-rail via n8n existe | A6 (= M5)   |
| R8 Comportamento     | ✅     | CLAUDE.md + documentation-first praticado (D-007, coletas M2)                                                                                                                          | —           |
| R9 Sessões           | ✅     | Protocolo vivo (SESSOES.md + sessions/); arquivamento >15 linhas ainda não atingido                                                                                                    | —           |
| R10 Arquitetura      | 🟡     | 14 módulos + tabelas donas VALIDADAS (`ARQUITETURA.md:14-46`) · **enforcement por ferramenta AUSENTE** (regra só documental — sem dependency-cruiser)                                  | A4 (= M3)   |
| R11 .env             | 🟡     | env.example do gateway exemplar + zod fail-fast no boot (`bootstrap/config.ts:107-116`, D-007) · **AUSENTE: gate de drift (check-env.sh checa 1 var, não wired) · `env.production.example` referenciado (`env.example:14`) mas INEXISTENTE** | A2          |
| R12 Acessibilidade   | 🔴*    | Sem jsx-a11y/axe (`eslint.config.mjs:21-29`) — *painel interno B2B → recomendado, não bloqueante                                                                                       | A7 (leve)   |
| R13 Tempo/fuso       | 🔴     | **38 campos DateTime no schema.prisma, ZERO `@db.Timestamptz`** (colunas naive) · sem `TZ` em nenhum container · agendamentos via setInterval sem tz (`retention.service.ts:25`, `proxy.service.ts:86`) · API serializa toISOString (UTC) sobre coluna naive = risco latente | **A3**      |
| R14 Assets           | ✅     | Dashboard Vite (hash automático); S3 só mídia de sessão; sem problema conhecido                                                                                                        | —           |
| R15 Deploy           | 🔴     | Auto-deploy webhook na main + **build no servidor** (sem registry — `ci.yml:1-3`) · sem smoke de artefato · sem staging · sem promoção gated · rollback lento (rebuild) · entrypoint com migrate antes do boot (bom: `docker-entrypoint.sh:38-40`) mas **sem retry de banco** | A5          |
| R16 Hardening        | 🟡     | Multi-stage, non-root via gosu (`docker-entrypoint.sh:11-19`), tini, HEALTHCHECK, heap auto-tune cgroup (`:25-36`) · **falta retry/backoff de banco no boot** (`set -e` derruba) · validação de env fica no Nest (ok) | A5          |
| R17 Auditorias       | 🟡     | AUDITORIAS.md criado AGORA; auditoria 07/2026 foi 1×; nada recorrente instalado (gates contínuos entram na A2)                                                                          | A2          |
| R18 Base             | ✅     | BASE_CONEXOZENVO.md na raiz (v3.2) + este arquivo + D-009 — esta sessão                                                                                                                | —           |

Legenda: ✅ conforme · 🟡 parcial · 🔴 ausente · ➖ não se aplica

## Ondas de adoção (prioridade por RISCO — produção não para, nada de big-bang)

| Onda   | Escopo                                                                                                                                                                                                             | Risco que elimina                                        | Sessão/branch               | Status   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | --------------------------- | -------- |
| **A1** | **Backup do Postgres de produção**: rotina agendada `pg_dump` → S3 off-site cifrado + notificação de sucesso/falha + **teste de restore documentado** + runbook `how-to/backup-restore.md` (antecipa o núcleo da M4) | Perda total do banco = perda do produto                  | feature/adocao-a1-backup    | pendente |
| **A2** | **Estancar débito novo**: husky+lint-staged (eslint, typecheck rápido) · gitleaks pre-commit+CI (`--no-git`, allowlist) · gate de drift env↔example · `npm audit` no CI · typecheck do dashboard no CI · script `check` agregado · criar `env.production.example` · gate de links da doc | Débito/segredo novo entrando sem barreira                | feature/adocao-a2-gates     | pendente |
| **A3** | **Fuso (R13)**: `TZ` nos containers (app/workers/banco) · `@db.Timestamptz` para TODA coluna nova JÁ · migration forward-only das 38 colunas naive (`ALTER ... TYPE timestamptz USING`, documentation-first: validar custo de rewrite por tabela e janela) | Corrupção silenciosa de histórico ao cruzar fusos        | feature/adocao-a3-tz        | pendente |
| **A4** | = **onda M3** (não duplicar): dependency-cruiser no CI (fronteiras R10) + unit de domínio + coverage mínima acordada                                                                                                 | Fronteira imaginária; regressão sem cobertura            | (sessão da M3)              | pendente |
| **A5** | **Deploy de excelência (R15/R16)**: registry GHCR + build 1× no CI (tag=SHA) + smoke do artefato + promoção gated + rollback por tag ensaiado + retry de banco no entrypoint + graceful shutdown auditado (workers BullMQ + desconexão limpa das engines) + primeira tag git/release 0.2.0 (R4) | Deploy irreversível; artefato nunca testado; SIGKILL no meio de job | feature/adocao-a5-deploy    | pendente |
| **A6** | = **onda M5** (não duplicar): canal único de alertas + uptime externo + decisão Sentry                                                                                                                              | Incidente descoberto pelo cliente                        | (sessão da M5)              | pendente |
| **A7** | Leve, oportunista: jsx-a11y como warning ao tocar dashboard (R12)                                                                                                                                                   | —                                                        | junto de trabalho no dashboard | pendente |

Ordem recomendada: **A1 → A2 → A3 → (M3=A4) → A5 → (M5=A6)**. A1 e A2 são
pequenas e independentes das ondas M em curso (M2 não é bloqueada).

Fora do escopo da adoção (é produto, não padrão): **estabilidade do ciclo de
vida de sessão WhatsApp** (conectar/QR/pairing/stop/restart/logout) — análise
em andamento; vira sessão R9 própria com backlog no ESTADO.md.

## Regras do modo (R18)

- Padrão novo OBRIGATÓRIO para código novo desde já (ex.: coluna nova de data
  = `@db.Timestamptz`; env nova = example no mesmo commit).
- Legado migra POR ONDA planejada; código tocado sai melhor do que entrou.
- Onda concluída → atualizar a coluna Status AQUI + linha em AUDITORIAS.md se
  nasceu gate novo.
