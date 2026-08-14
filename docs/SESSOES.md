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
| 2026-08-13-1630-wwebjs-proxy-anonimizado | 13/08 16:30 | Incidente wweb em prod: diagnóstico build 1045 (B-002, rollback) + fix proxy autenticado no Chromium via forwarder local proxy-chain (B-001) | `wwebjs.engine.ts` + teste + `apps/gateway/package.json` (dep proxy-chain) + docs | feature/wwebjs-proxy-anonimizado |
| 2026-08-13-2100-wwebjs-store-travado | 13/08 21:00 | 🟢 FASE FINAL — P-014: causa cravada (injeção concorrente pós-QR + sync de conta pesada), teto/probe EM PROD (`3e74d25`), pesquisa completa (`pesquisa-wwebjs-2026-08.md`), **dep wwebjs pinada no commit `1780711` (D-012, foco só wwebjs)** — resta merge+deploy+validação de ciclos de QR | feature/wwebjs-store-travado |

## 📢 Avisos entre sessões (leitura obrigatória na abertura — R9)

> Decisão/mudança que afeta outras sessões entra AQUI na hora: data, sessão, o quê,
> quem precisa saber. A sessão que absorveu o aviso o remove no próprio encerramento.

- **14/08 · wwebjs-p015-shutdown-limpo (ENCERRADA):** regra nova que afeta TODA sessão que
  deployar o gateway (D-014): **troca de container pode exigir re-scan do QR da sessão wwebjs**
  (re-sync incremental empaca em 99% nas builds atuais; bootstrap pós-QR completa sempre) —
  agrupar deploys e combinar a janela com o dono. Também: main local está 1 commit de CÓDIGO à
  frente (`25cad0c`, P-019) — NÃO pushar sem essa janela; `WA_LOG_LEVEL=info` fica de propósito
  (diagnóstico) até P-019 em prod. Quem absorver o push do P-019 remove este aviso.
- **13/08 · wwebjs-store-travado:** leitura da env de PROD no Dokploy (~23h UTC) achou
  **`GUARDRAIL_ENFORCE=true`** (linha 63) — **diverge do ESTADO.md/M2**, que dizem modo observação
  (`false`). Quem precisa saber: sessão **M2** (se o dono ligou de propósito, a onda M2 está de
  fato ativa e precisa reconciliar; se foi engano, desligar). Também constatado
  `WA_REQUIRE_PROXY=true` (B-001 quase fechada) e `WA_LOG_LEVEL=warn` (logs `info` das engines
  invisíveis em prod — afeta QUALQUER sessão que dependa de log de engine para diagnóstico).
- **12/08 · adocao-base-v43:** base universal agora é **v4.3** (R0–R21). Novidades que
  afetam TODA sessão: abertura passa a incluir `docs/PENDENCIAS.md` (novo quadro
  central P-xxx/B-xxx) e o **eco de leitura** no arquivo ATIVA-; encerramento ganha
  **reconciliação documental** (diff × mapa de gatilhos do R3) e checkpoint ganha os
  campos **BLOQUEADO EM VOCÊ** e **DOCS TOCADAS**. Sessões ativas (M2, auth-refresh)
  encerram no formato novo.

## ✅ Histórico (mais recente primeiro — as 5 do topo são leitura obrigatória na abertura)

| ID                                    | Período | Entregue                                                                                    | Branch/PR                            |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| 2026-08-14-0707-wwebjs-p015-shutdown-limpo | 14/08 | **Dia inteiro de wwebjs em prod**: P-015 ✅ (volume gateway-wwebjs + shutdown limpo), B-002 ✅ (patch `$1` + build 1045101284, leads 99/99), P-016 ✅ (probe no envio), P-017 ✅ (teto mídia 24MB + heal em crash), 4GB, P-019 codada (aguarda deploy), D-013/D-014 | feature/wwebjs-p015-shutdown-limpo + feature/wwebjs-b002-patch-s1 |
| 2026-08-13-0810-wwebjs-w7c-search      | 13/08 | W7 searchMessages (P-011, ÚLTIMO item — **fecha o W7**): busca no banco `GET /messages/search`, agnóstica de engine | feature/wwebjs-w7c-search |
| 2026-08-13-0744-wwebjs-w7b-chat-mgmt   | 13/08 | W7 gestão de chat (P-011): `setChatFlag` archive/pin/mute/unread (`POST /messages/:chatId/flag`) — wwebjs, 501 no Baileys | feature/wwebjs-w7b-chat-mgmt |
| 2026-08-13-0726-wwebjs-w7-inbox        | 13/08 | W7 inbox 1º incremento (P-011): backfill de histórico da engine → `wa_messages` (`POST /messages/sync`; getChats/fetchMessages no wwebjs, 501 no Baileys) — a inbox de leitura já existia | feature/wwebjs-w7-inbox |
| 2026-08-12-2043-wwebjs-qualidade-max  | 12/08 | Qualidade/desempenho do motor wwebjs: leads em LOTE (round-trips CDP O(N)→O(N/50)), presença global real, pairing+diagnóstico, UA anti-flag por sessão (P-012 ✅) + W8 grupos avançados nas 2 engines (membership/settings/foto — P-011) | feature/wwebjs-qualidade-max |
| 2026-08-12-1959-wwebjs-p012-announce-restrict | 12/08 | Polimento P-012: announce/restrict REAIS nos grupos do wwebjs (era `false` fixo — correção) | feature/wwebjs-p012-announce-restrict |
| 2026-08-12-1947-wwebjs-w8b-foto-perfil | 12/08 | W8b (recurso NOVO, 2 engines): foto de perfil da conta via URL, aditivo (completa a W8) | feature/wwebjs-w8b-foto-perfil   |
| 2026-08-12-1941-wwebjs-w8-perfil-conta | 12/08 | W8 (recurso NOVO, 2 engines): perfil da conta — status/recado + nome de exibição, aditivo | feature/wwebjs-w8-perfil-conta   |
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

> Sessões mais antigas (≤21/07) movidas para [SESSOES_ARQUIVO.md](SESSOES_ARQUIVO.md) — higiene de contexto (R9 v3.2).
