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

## 📢 Avisos entre sessões (leitura obrigatória na abertura — R9)

> Decisão/mudança que afeta outras sessões entra AQUI na hora: data, sessão, o quê,
> quem precisa saber. A sessão que absorveu o aviso o remove no próprio encerramento.

- **12/08 · adocao-base-v43:** base universal agora é **v4.3** (R0–R21). Novidades que
  afetam TODA sessão: abertura passa a incluir `docs/PENDENCIAS.md` (novo quadro
  central P-xxx/B-xxx) e o **eco de leitura** no arquivo ATIVA-; encerramento ganha
  **reconciliação documental** (diff × mapa de gatilhos do R3) e checkpoint ganha os
  campos **BLOQUEADO EM VOCÊ** e **DOCS TOCADAS**. Sessões ativas (M2, auth-refresh)
  encerram no formato novo.

## ✅ Histórico (mais recente primeiro — as 5 do topo são leitura obrigatória na abertura)

| ID                                    | Período | Entregue                                                                                    | Branch/PR                            |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| 2026-08-12-1921-wwebjs-w6-webhook-reacoes | 12/08 | W6 (recurso NOVO, 2 engines): evento `message.reaction` no webhook (reações recebidas), aditivo | feature/wwebjs-w6-webhook-reacoes   |
| 2026-08-12-1902-wwebjs-w5b-location-poll | 12/08 | W5b (recurso NOVO, 2 engines): enviar localização + enquete, aditivo; reply/vote/vCard deferidos | feature/wwebjs-w5b-location-reply   |
| 2026-08-12-1746-wwebjs-w5-mensagens-ricas | 12/08 | W5 (recurso NOVO, 2 engines): reações (rota nova) + menções (text/media-url), aditivo; contracts→P-013 | feature/wwebjs-w5-mensagens-ricas   |
| 2026-08-12-1736-wwebjs-w4-superficie   | 12/08   | W4 wwebjs (código): implementa os 14 nope() — grupos/contatos/canais (paridade IEngine com Baileys); P-010 ✅, residual→P-012 | feature/wwebjs-w4-superficie         |
| 2026-08-12-1723-wwebjs-w3-ciclo-vida   | 12/08   | W3 wwebjs (código): limpa LocalAuth em disco (fim do vazamento + new-qr recupera) + destroy com teto + qrBase64/cache no stop + nope→501 (P-009 ✅) | feature/wwebjs-w3-ciclo-vida         |
| 2026-08-12-1715-wwebjs-w2-midia        | 12/08   | W2 wwebjs (código): mídia no S3 (in/out) + envelope com engine real + sendMediaAsDocument/Sticker + guard sent null (P-008 ✅) | feature/wwebjs-w2-midia              |
| 2026-08-12-1702-wwebjs-w1-estabilidade | 12/08   | W1 wwebjs (código): reconexão automática + fim do start no-op + guard WA_REQUIRE_PROXY + 1º teste da engine — resta B-002 (webVersion) | feature/wwebjs-w1-estabilidade       |
| 2026-08-12-1648-analise-wwebjs-parte2 | 12/08   | Catálogo de recursos wwebjs (§7–§8): todas as capacidades da lib 1.34.7 + plano W5–W8 de recurso novo — pendências: P-011 | feature/analise-wwebjs-parte2        |
| 2026-08-12-1551-analise-wwebjs        | 12/08   | Análise do motor wwebjs (matriz 28 métodos + 3 P0 + plano W1–W4) → docs/analise-wwebjs-2026-08.md — pendências: P-007..P-010 | feature/analise-wwebjs               |
| 2026-08-12-1504-adocao-base-v43       | 12/08   | Base universal v3.2 → v4.3 (D-011): BASE R0–R21 · PENDENCIAS.md · 📢 Avisos · ondas A8–A11 — pendências: P-006 | feature/adocao-base-v43              |
| 2026-07-22-1700-hardening-antiban     | 22/07   | Hardening anti-flag: fingerprint realista por sessão · log de conexão sem proxy · WA_REQUIRE_PROXY (91/91) | feature/hardening-antiban            |
| 2026-07-21-1730-estabilidade-sessoes  | 21/07   | P0 estabilidade: mutex Baileys · creds limpas no loggedOut · POST /new-qr + painel · 401 → /login (82/82) | feature/estabilidade-sessoes         |
| 2026-07-21-1630-adocao-base-v32       | 21/07   | Base universal v3.2 adotada (R18): BASE_CONEXOZENVO.md + MAPA + AUDITORIAS + ADOCAO (D-010) | feature/adocao-base-v32              |

> Sessões mais antigas (≤11/07) movidas para [SESSOES_ARQUIVO.md](SESSOES_ARQUIVO.md) — higiene de contexto (R9 v3.2).
