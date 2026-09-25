# Sessão: e4-rotas-egress

- **Status:** ✅ DONE — P-053, P-065 (+ P-070 e P-071 achadas aqui) entregues na branch da Onda 1;
  **Onda 1 fechada** (PR #6 — merge do dono = deploy A; checklist e B-004 em
  [how-to/deploy-a-onda1.md](../how-to/deploy-a-onda1.md)).
- **Início:** 25/09/2026 14:43 BRT (macOS, Node 26.0.0 / npm 11.12.1, Docker Desktop 29.8.0)
- **Objetivo:** Etapa **E4** do [roteiro](../ROTEIRO-ONDAS-2026-09.md) — **P-053** (rate-limit,
  autoLogging e AuditInterceptor decidiam por `req.url` cru → rota resolvida) + **P-065** (egress
  aceitava IPv6 v4-mapeado em hex → `net.BlockList` v4+v6). Fecha a Onda 1.
- **Escopo final (tocado):** `apps/gateway/src/main.ts`, `app.module.ts`, `bootstrap/` (novos
  `route-url.ts`, `http-logger.ts`, `rate-limit.ts` + specs; `fastify-adapter.ts`),
  `modules/iam/interface/{auth.controller,audit.interceptor}.ts` (+ spec novo),
  `shared-kernel/safe-fetch.ts` (+ spec), `modules/groups/interface/groups.controller.ts` e
  `modules/sessions/interface/sessions.controller.ts` (só a rota de foto — P-070), e2e
  (`audit` novo, `f5`, `webhooks`), `.github/workflows/ci.yml` (smoke do login no job `imagens`),
  mapa gerado e docs de encerramento.
- **Fora do escopo (mantido):** produção/Dokploy (R0 — B-004 é do dono), contrato `/api` (nada
  muda), fastify 5.12 (preso ao pin do Nest 11.2.6), `trustProxy`/XFF (B-007), 404 sem rate-limit
  (aceite GHSA-p68q — D-023), mensagem de egress com o IP resolvido (pré-existente desde a P-031),
  catálogo explícito de ações auditáveis (P-036).
- **Branch:** `feature/onda1-guardas-seguranca` (continuação da E3, `5df3c0f`; PR #6). Commits:
  `6c87a26` (código, testes, CI, mapa gerado) + o commit `docs(e4)` de encerramento.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** execução pelo roteiro de 25/09 — E1 ✅, E2 ✅, E3 ✅; próxima = E4 (esta), que fecha a
  Onda 1 = deploy A. Produção segue em `768fb26` (15/09). `.cloud` = produção, sem homologação.
- **SESSOES:** ativa alheia `lid-envio-wwebjs` (escopo `modules/sessions/infrastructure/wwebjs/`) —
  não tocada. Avisos lidos: E3 (middie oficial no Nest 11.2.6; 2+ arquivos = 413; Node fixado 26.10.0;
  `advisories.yml`; `allowScripts` ativo; Onda 8), E2 (postinstall `--error-on-fail`, job `imagens`),
  onda0b (roteiro, mapa do código, start-first D-020, duas engines D-021, P-065).
- **PENDENCIAS:** P-053 e P-065 (esta etapa). B-004 (stop-first) depende do deploy A — instrução ao
  dono no fim. B-005/B-006/B-007 seguem com o dono.
- **Roteiro E4 + MAPA-CODIGO §4.4 e §5.1 P-053/P-065:** `main.ts:68-75` (max/allowList por
  `req.url`), `audit.interceptor.ts:47-51, :65, :74`, `app.module.ts:50-53` (`autoLogging.ignore` vê
  IncomingMessage cru, sem `routeOptions` — E3 viu `req.url` `'/'`), `auth.controller.ts:47`;
  `safe-fetch.ts:71-88` (regex :77), `:119-158`. Da E3: forma absoluta ainda contorna o teto do login
  no Nest 11.2.6; esquema maiúsculo → 404 e `routeOptions.url` undefined; `inject` reduz a URL a
  origin-form (usar `app.listen(0)` + socket cru, como em `fastify-adapter.absolute-form.spec.ts`).
- **Versões instaladas no início (npm ls):** fastify 5.11.3, find-my-way 9.7.0, @fastify/rate-limit
  11.2.0, @fastify/middie 9.3.4, @nestjs/platform-fastify 11.2.6, nestjs-pino 4.6.1, pino-http
  11.0.0, light-my-request 6.6.0; Node local 26.0.0 (imagem: 26.10.0).

## Fontes (documentation-first)

- **Código instalado (conferido por PoC):** `fastify/lib/request.js:164-210` (url/originalUrl/
  `routeOptions` — `config.url`, undefined em 404), `fastify/lib/route.js:276, :329-333, :388-395,
:456-457, :560-568` (config.url = prefixo+path fixado no registro; hooks de root antes dos de rota;
  roteamento antes do onRequest), `find-my-way/index.js:39, :571-573` (`FULL_PATH_REGEXP` preguiçoso),
  `@fastify/rate-limit/index.js:13, :172-191, :233-243` + `store/LocalStore.js:11-44, :79-81` (hook de
  rota via onRoute; config de rota → store filho, parâmetros mesclados com `Object.assign`),
  `@nestjs/platform-fastify/decorators/route-config.decorator.js` + `adapters/fastify-adapter.js:
130-142, :474-505, :577-597`, `@fastify/middie/lib/engine.js:156-159, :181, :216-229`,
  `pino-http/logger.js:95-99, :181-185, :198-199`.
- **Doc oficial:** Node 26 `net.md:94-178` (espelho `~/dioggo-agents/agentes/docs/node/26/` —
  `blockList.check`: "IPv6 notation for IPv4 addresses works") e `url.md` (WHATWG); Context7
  `/fastify/fastify` (Request `routeOptions`, Hooks/Lifecycle) e `/fastify/fastify-rate-limit`
  (opções por rota, `local-store` child); registros IANA IPv4/IPv6 Special-Purpose e
  ipv6-address-space (WebFetch, versões de 10/2025); RFC 4291 §2.5.5.1, 2765, 3056, 3849, 3879,
  4380, 5737, 6052, 6666, 7526, 8215, 9637; código do Node v26.0.0 `src/node_sockaddr.cc`
  (IPv4×regra IPv6) e `lib/internal/blocklist.js:129-143` (check devolve false para inválido/família
  trocada); Dokploy v0.30.2 `swarm-forms/stop-grace-period-form.tsx` e `utils/docker/utils.ts:
678-700` (via `gh api`); espelho Dokploy `core/applications/rollbacks.mdx:57-58`; Traefik v3.5
  `pkg/middlewares/forwardedheaders/forwarded_header.go` (apaga X-Forwarded-* de remetente não
  confiável).

## Diário

- 14:43 — abertura R9, leitura obrigatória feita, sessão registrada.
- 14:50–15:10 — **workflow de investigação** (5 frentes com PoC + crítico de completude): matriz de
  39 variantes de URL por socket cru (10 de 13 que chegam ao login furavam o teto; com
  `routeOptions.url`, nenhuma); rate-limit A × B (B = `@RouteConfig`, store próprio → D-025);
  `autoLogging.ignore` morto (middleware vê `req.url` `'/'`) → carimbo no adapter + `customLogLevel`;
  auditoria: 77 rotas de mutação, conjunto idêntico exceto sessões `messages…`; egress: exploit
  reproduzido no macOS e no Linux do Docker; **armadilha**: regra IPv6 com `::ffff:0:0/96` (sugerida
  no texto da P-065) bloquearia TODO IPv4. O crítico achou **P-070** (fotos com `fetch` cru).
- 15:10–15:25 — implementação + specs; cada spec novo provado vermelho contra o código antigo.
- 15:25–15:50 — **workflow de revisão adversarial** (4 lentes + verificador cético por achado — 15
  agentes): 11 achados, 7 reais (todos "menor"), 4 refutados. Corrigidos: forma absoluta com `?`
  antes do caminho (→ 400 na borda, **P-071**); variantes do `http-logger.spec` que não provavam nada
  (GET 2xx); comentário que citava spec inexistente; `bash -e` no smoke do CI; e2e da auditoria mais
  robusto; nota `data:` na INTEGRACAO. Revisores: 178 mil endereços comparados com referência
  independente (0 divergência), 57 grafias de SSRF sem hit no servidor-isca, 42 hosts públicos reais
  sem falso positivo, 5× cada spec sem flake.
- 15:50 — **gateway compilado de verdade** (`node dist/main.js`, NODE_ENV=production) contra banco
  descartável `smoke_e4` (sem sessões — nada reidratou) + Redis db 9: o script do smoke do CI passou
  (10 × 401 em 4 grafias, 11ª = 429); alvo ambíguo → 400 com linha `HttpEdge`; `/%68ealth` sem
  header de rate-limit; banco apagado e db 9 limpo depois.

## Provas (25/09, local)

- `npm run lint` · `npm run format:check` · `npm run depcruise` (215 módulos) · `npx tsc --noEmit` ·
  `npm run gateway:build` · `node scripts/mapa-codigo.mjs --check` — verdes.
- `npm run test` — **41 arquivos, 360/360** (eram 338 na E3).
- Specs que falham com o código antigo (mutação manual): `safe-fetch.spec.ts` 5 falhas (inclusive o
  exploit chegando ao servidor); `rate-limit.spec.ts` 3 (`%6Cogin` com limite 600; login 429 depois
  de 20 GETs; `/health?probe=1` limitado); `audit.interceptor.spec.ts` 3; `http-logger.spec.ts` sem
  o carimbo 1; `test/audit.e2e-spec.ts` com o interceptor antigo 1.
- BlockList nova no Node 26.10.0 (docker `node:26.10.0-bookworm-slim`, `--network none`): 26
  vetores, 0 falha.

- **CI do PR #6 (run 36178313066, `6c87a26`+`41c8ef5`, amd64):** `ci` 2m58s ✅ · `imagens` 2m22s ✅
  (smoke novo: "login: 10 × 401 e a 11ª = 429 (origin-form, %-encoding e forma absoluta no mesmo
  balde)" contra a imagem real) · `advisories` 15s ✅.

### Reconciliação documental — R3/R9

- Borda HTTP, egress e contrato de erro das fotos mudaram → MAPA-CODIGO (§2, §3.1, §4.2, §4.4, §5,
  §5.1 P-053/P-065/P-070/P-071, §6), INTEGRACAO (limite de requisições, egress IPv6, fotos),
  DECISOES (D-025, D-026), PENDENCIAS (P-053 ✅, P-065 ✅ com a faixa-armadilha riscada, P-070 e P-071
  novas ✅, B-007 +2 conferências), ESTADO, ROTEIRO (E4 ✅, ações do dono, diário, mensagem da E22),
  CHANGELOG, SESSOES, how-to novo `deploy-a-onda1.md`.
- **Docs-n/a:** ARQUITETURA (nenhuma fronteira/tabela mudou — depcruise verde), `packages/contracts`
  (nenhum payload novo), CLAUDE.md, AUDITORIAS (nenhuma auditoria da agenda executada).

### Checkpoint

- **O QUE FOI FEITO:** rate-limit/log/auditoria pela rota resolvida (teto do login em contador
  próprio), egress com `net.BlockList`, fotos por URL pelo `safeFetch`, alvo ambíguo → 400; specs de
  borda com socket cru; smoke do login no CI contra a imagem; runbook do deploy A + B-004.
- **PACOTES:** nenhum.
- **DECISÕES REGISTRADAS:** D-025 (borda pela rota; login com store próprio; path cru na auditoria;
  alvo ambíguo = 400) e D-026 (egress com BlockList; IPv6 só em `2000::/3`; armadilha
  `::ffff:0:0/96`).
- **EFEITO DE DEPLOY (no merge = deploy A):** login deixa de levar 429 por causa do polling do mesmo
  IP e as variantes de URL passam a contar no teto de 10; mutações em grafias alternativas entram na
  auditoria; `HEAD /health` e `/metrics` 401 deixam de gerar linha do pino-http; destino de
  webhook/mídia/foto em IPv6 que embute IPv4 privado, TEST-NET, 6to4/Teredo → recusado; fotos por URL
  com a política de egress (400 `URL da imagem recusada`); alvo `http://h?x=/…` → 400. Nenhuma rota
  ou payload novo, nenhuma migration.
- **CLASSE DE ERRO INTRODUZÍVEL E GATE:** decisão de borda por string → specs de socket cru que
  falham com a lógica antiga + smoke do CI na imagem; regra IPv6 que engole o IPv4 → guarda no
  `safe-fetch.spec.ts`; plugin de rota registrado depois do init → `rate-limit.spec.ts` monta como o
  main.ts e o smoke do CI roda o main.ts real.

## BLOQUEADO EM VOCÊ

- **Mergear o PR #5 e depois o PR #6 = deploy A**, seguindo
  [how-to/deploy-a-onda1.md](../how-to/deploy-a-onda1.md) §1–§2 (inclui
  `gh workflow run advisories.yml --ref main` e o e-mail "only failures" das Actions).
- **Depois do deploy A estável: B-004** (stop-first) — §3 do mesmo runbook.
- B-007 ganhou 2 conferências só leitura: `RATE_LIMIT_MAX` no env e `forwardedHeaders` do Traefik
  (XFF).

## DOCS TOCADAS

`CHANGELOG.md` · `docs/ESTADO.md` · `docs/SESSOES.md` · `docs/PENDENCIAS.md` · `docs/DECISOES.md` ·
`docs/INTEGRACAO.md` · `docs/MAPA-CODIGO.md` · `docs/ROTEIRO-ONDAS-2026-09.md` ·
`docs/how-to/deploy-a-onda1.md` (novo) · `docs/reference/mapa-codigo/*` (gerado) · esta sessão.
