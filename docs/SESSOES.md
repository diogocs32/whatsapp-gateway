# 🔀 SESSÕES DE TRABALHO — ConexoZenvo

> Painel de conversas paralelas (protocolo R9). Toda sessão se registra aqui ao abrir,
> cria seu arquivo em `sessions/` e trabalha na própria branch `feature/*`.
> Escopos de sessões ativas devem ser DISJUNTOS (ideal: 1 sessão = 1 módulo).
> Pontos de contato globais (declarar no escopo se for tocar): `schema.prisma`,
> `packages/contracts`, `app.module.ts`, `docker-compose.yml`, `ci.yml`.

## 🟢 Sessões ativas

| ID                                    | Início      | Objetivo                                            | Escopo                                                                                                              | Branch                        |
| ------------------------------------- | ----------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 2026-07-10-1040-m2-guardrail-ativo    | 10/07 10:40 | M2 — janela de observação → ligar GUARDRAIL_ENFORCE | docs/ + scripts/guardrail-observe.mjs (sem código do gateway)                                                       | feature/m2-guardrail-ativo    |
| 2026-07-19-0332-auth-refresh-rotation | 19/07 03:32 | Fix 401 `/auth/me`: refresh-token rotation (sessão não expira no meio do trabalho) | módulo `iam` (auth) + `apps/dashboard` (auth/api) + **`schema.prisma`** (refresh_tokens) + **`packages/contracts`** + config.ts + docs | feature/auth-refresh-rotation |

## ✅ Histórico (mais recente primeiro)

| ID                                    | Período | Entregue                                                                                    | Branch/PR                            |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| 2026-07-22-1700-hardening-antiban     | 22/07   | Hardening anti-flag: fingerprint realista por sessão · log de conexão sem proxy · WA_REQUIRE_PROXY (91/91) | feature/hardening-antiban            |
| 2026-07-21-1730-estabilidade-sessoes  | 21/07   | P0 estabilidade: mutex Baileys · creds limpas no loggedOut · POST /new-qr + painel · 401 → /login (82/82) | feature/estabilidade-sessoes         |
| 2026-07-21-1630-adocao-base-v32       | 21/07   | Base universal v3.2 adotada (R18): BASE_CONEXOZENVO.md + MAPA + AUDITORIAS + ADOCAO (D-010) | feature/adocao-base-v32              |
| 2026-07-11-1753-proxy-na-criacao      | 11/07   | Feature D-008: proxy livre opcional na criação de sessão (API+painel+contrato, 79/79)       | feature/proxy-na-criacao             |
| 2026-07-10-1015-m1-destravar-producao | 10/07   | M1 — deploy 808c175 + O1 (proxies ALIVE) + O2 (Memory Limit) + O3 (DNS) → auditoria 100% ✅ | feature/m1-destravar-producao        |
| 2026-07-10-1000-m0-doc-viva           | 10/07   | M0 — doc viva completa (tabelas donas validadas; D-001–D-004; O4 ✅)                        | feature/m0-doc-viva (merge sem push) |
