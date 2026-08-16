# Sessão 2026-08-16 16:52 — análise detalhada + otimizações (deps atualizadas e hot paths)

- **Branch:** `feature/otimizacao-deps-hotpaths` (NÃO mergeada — merge+deploy do dono)
- **Objetivo:** pedido do dono: "análise detalhada baseada em documentações oficiais, nunca
  adivinhar, todas as otimizações possíveis" + "manter deps o mais atualizado dentro das
  compatibilidades e funcionalidades".
- **Escopo real tocado:** `package.json` (raiz + gateway) + lockfile · `bootstrap/config.ts` ·
  `infra/prisma/prisma.service.ts` · `infra/directory/contact-directory.service.ts` ·
  `messaging/infrastructure/prisma-message.repository.ts` · `webhooks/infrastructure/webhook-queue.ts` ·
  `campaigns/infrastructure/campaign-queue.ts` · `schema.prisma` + migration
  `20260816200825_indice_wa_contacts_phone` (ADITIVA) · dashboard `App.tsx` + `nginx.conf` · docs.
  **NÃO tocou:** módulo `iam`, `wwebjs.engine.ts`, `baileys.engine.ts`, `session-manager.service.ts`,
  contrato `/api` (R0), `packages/contracts`.

## ECO DE LEITURA (R9)

- **ESTADO.md:** M1 concluída; prod roda `ccc17b1`+4GB; P-019/P-020 na main aguardando deploy;
  D-014 (deploy pode custar re-scan wwebjs → agrupar janelas). Divergência GUARDRAIL_ENFORCE
  pendente da sessão M2.
- **SESSOES.md:** 4 ativas (M2 docs · auth-refresh/iam · wwebjs-proxy-anonimizado ·
  wwebjs-store-travado) — escopo desta sessão escolhido DISJUNTO de todas.
- **PENDENCIAS.md:** B-001 quase fechada; B-002 fechada (revalidar ~out); P-004 é da M3.
- **Travas respeitadas:** TS 5.9.3 fixo (TS 6/7 quebra `nest build`) · wwebjs pinada no tarball
  `1780711` (D-012 — intocada) · jobId sem `:` · forward-only migrations · contrato `/api`.

## Análise detalhada (EP = evidência no repo/registry · DO = doc oficial)

### 1. Dependências — o que subiu e por quê

| Dep                                                                                    | De → Para                      | Evidência (DO)                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @nestjs/*                                                                              | 11.1.27 → 11.2.1               | Release notes oficiais: fixes de **SSE** (teardown no disconnect em 11.1.28+, early-return abort em 11.2.1) — o gateway TEM `GET /api/events/stream`; sem breaking                                                                                                                                                                 |
| @prisma/*                                                                              | 7.8.0 → 7.9.1                  | Release 7.9.0: fix de **connection leak em transações interativas nos adapters Postgres** + regressão de perf do TS; sem breaking                                                                                                                                                                                                  |
| fastify                                                                                | 5.8.5 → **5.11.3** (pin exato) | Regra do pin (ca0629d): casar com o exato que o `@nestjs/platform-fastify` declara (11.2.1 declara `fastify 5.11.3` — conferido no registry). Bônus das releases oficiais: 5.10 "reduced per-request overhead in lifecycle", 5.11 "content-type caching for response serialization performance". 5.12 NÃO (criaria 2 cópias)       |
| Baileys                                                                                | rc13 → **rc14**                | Compare oficial rc13...rc14: **8 commits** — fix import `Long`, view-once em Android browsers, fix aninhamento do token de foto de perfil, bump da versão WA Web; sem breaking. Engine de PRODUÇÃO → validar reconexão da frota no 1º deploy                                                                                       |
| bullmq                                                                                 | 5.79.2 → 5.81.3                | In-range; **dedupa o ioredis** (antes: 5.10.1 aninhada no bullmq + 5.11.1 raiz → agora só 5.11.1, conferido com `npm ls`)                                                                                                                                                                                                          |
| pino                                                                                   | 9.14 → **10.3.1**              | Release v10.0.0: único breaking = **drop de Node 18** (rodamos Node 26). Motivo: `pino-http@11` exige `pino ^10` e mantinha uma SEGUNDA cópia aninhada; `fastify@5.11.3` aceita `^9.14\|\|^10.1` e `nestjs-pino@4.6.1` aceita `^10` nos peers (conferido no registry) → pino unificado (só o Baileys aninha o ^9 dele, inevitável) |
| pg 8.23 · @fastify/* · aws-sdk 3.1111 · vitest 4.1.10 · @swc 1.16 · @types/*           | minors/patches                 | in-range (`npm update`)                                                                                                                                                                                                                                                                                                            |
| dashboard: react 19.2.8 · rr 7.18.2 · vite 8.2.1 · tailwind 4.3.3 · plugin-react 6.0.5 | minors/patches                 | in-range                                                                                                                                                                                                                                                                                                                           |

**Majors deferidos → P-021** (cada um com motivo técnico): zod 4 · bullmq 6 · ioredis 6 (bullmq 5
pina ^5) · @hapi/boom 10 (**Baileys pina ^9.1.3** — subir des-dedupa e quebra `instanceof` nos
erros do socket) · proxy-chain 3 (arquivo de sessão ativa) · ulid 3 (ESM-only, sem ganho) ·
dotenv 17 · TS ≥6 (trava do projeto). `npm audit`: 5 high presos na cadeia
`wwebjs→puppeteer→extract-zip` (sem fix upstream; wwebjs pinada por D-012; mitigação:
`PUPPETEER_SKIP_DOWNLOAD=true` nos Dockerfiles — extract-zip não roda no runtime).

### 2. Otimizações de código (todas com DO)

1. **Pool do Postgres** (`prisma.service.ts` + envs novos): DO = guia oficial de upgrade v7 do
   Prisma ("Driver adapters... `pg` driver has no connection timeout by default (0), while Prisma
   ORM v6 used a 5-second timeout") + connection-pool.mdx com os valores de paridade
   (5s connect / 300s idle). Sem isto, pool saturado = requests esperando PARA SEMPRE a aquisição.
   `DB_POOL_MAX` (default 10 = default do pg) exposto p/ tuning em prod (18 sessões + polling).
2. **`recordMany` em lote** (`contact-directory.service.ts`): EP = chamado pelos sync de contatos
   das 2 engines (`baileys.engine.ts:1296/1308`, `wwebjs.engine.ts:1640`) com centenas–milhares
   de registros, 1 upsert POR registro em série. DO = PostgreSQL 18 `sql-insert` (ON CONFLICT DO
   UPDATE com `EXCLUDED` + expressões; "deterministic statement" → dedup in-batch por waId
   obrigatório). Semântica preservada: `COALESCE(EXCLUDED.col, atual)` = nunca sobrescrever dado
   conhecido com null; `data` só no INSERT (update nunca tocou); `updatedAt=now()` explícito
   (coluna `@updatedAt` não tem default no DB — conferido na migration de criação). Chunks de 200
   - fallback por registro.
3. **ACK atômico** (`prisma-message.repository.ts`): EP = `updateStatusByKey` roda a cada
   delivered/read de TODAS as sessões (hot path) com findFirst+update — 2 round-trips e corrida
   read-modify-write (dois ACKs concorrentes podiam regredir `read`→`delivered`). DO = PostgreSQL
   UPDATE com guarda no próprio statement (atômico em Read Committed). Vira 1 statement com o
   ranking em `CASE`; usa o índice `[sessionId, keyId]` existente.
4. **`WEBHOOK_CONCURRENCY`** (webhook-queue): DO = BullMQ guide/workers/concurrency (default 1;
   opção `concurrency` p/ I/O-bound). EP = entrega tem teto de 10s → um endpoint fora do ar
   segurava TODA a fila. Default 8, tunável por env. Ordem nunca foi contratual (retries+backoff
   já reordenavam; envelope tem timestamp).
5. **Teto de mídia na campanha** (campaign-queue): `fetchMedia` bufferizava a URL inteira sem
   limite; agora `MEDIA_MAX_BYTES` (content-length antes + byteLength depois).
6. **Índice `wa_contacts (sessionId, phone)`** (migration aditiva): EP = `namesFor` (hot path do
   `resolveNames` de leads/grupos) filtra por OR em waId/lid/jid/**phone** — phone era a única
   chave sem índice (impedia o BitmapOr completo); a busca por telefone do painel também usa.
7. **Dashboard code-splitting** (`App.tsx`): DO = react.dev `lazy` (+ mapeamento de export
   nomeado → default) e split automático por import dinâmico do Vite. Resultado medido no build:
   16 chunks por rota (Login 1,9 kB · maior rota 14 kB) + vendor 241 kB — antes era bundle único.
8. **nginx `gzip_vary on`**: DO = ngx_http_gzip_module (`Vary: Accept-Encoding` p/ proxy/CDN na
   frente — Traefik).

### 3. Avaliado e NÃO mudado (com motivo)

- **@fastify/compress** na API: comprimiria o SSE (`text/event-stream` casa nos types default) e
  quebraria o streaming; ganho pequeno p/ payloads JSON de polling. Não vale o risco.
- **Compartilhar conexão ioredis com as Queues do BullMQ**: economizaria 2 conexões, mas cria
  acoplamento de teardown (RedisService.quit × close das filas) — ganho marginal, risco real.
- **Índice parcial no unique de idempotencyKey** e **pg_trgm no search**: o próprio projeto
  deferiu ("se o volume crescer") — mantido como está; volumes atuais não justificam.
- **`nest build` com SWC**: mudaria o pipeline de build de PROD (typeCheck separado) — risco de
  paridade por ganho só de DX.
- **`npm ci -w apps/gateway` no Dockerfile** (pular workspace do dashboard na imagem do gateway):
  mexe na topologia de install validada no Dokploy — deixado como candidato futuro.
- **MetricsService/health/retention/EventBus/fanout**: já otimizados (cache Redis+in-flight dedup,
  probe com TTL, timers unref, captureRejections) — nada a fazer.

## Validação (nesta máquina, infra local via `npm run infra:up`)

- Bateria e2e completa: **170/170 testes, 20/20 arquivos** ✅ (inclui o teste que acusa patch `$1`
  ausente — patch-package seguiu aplicando na wwebjs pinada)
- `npx tsc --noEmit -p apps/gateway/tsconfig.json` → **0 erros** ✅
- `npm run lint` → **0** ✅ · `prettier --check` nos tocados → ✅
- `npm run gateway:build` ✅ · `npm run dashboard:build` ✅ (16 chunks por rota confirmados)
- Migration `indice_wa_contacts_phone` criada e aplicada no Postgres 18 local ✅
- **Boot smoke com as deps novas**: `node dist/main.js` → `/health` `{status:"ok", database:true,
redis:true, storage:true}`; pino 10 + pino-pretty renderizando; entregas de webhook visivelmente
  paralelas (rajadas de 4 jobs simultâneos no log); shutdown limpo ✅

## Checkpoint

- **DOCS TOCADAS:** `CHANGELOG.md` (bloco da sessão) · `DECISOES.md` (D-016) · `PENDENCIAS.md`
  (P-021) · `SESSOES.md` (ativas/histórico + 📢 aviso de deploy) · `ESTADO.md` (divergência +
  próximo passo 0b; corrigida a linha do dedup — já mergeado em `4c74f4d`) · este arquivo.
- **BLOQUEADO EM VOCÊ (dono):**
  1. **Merge de `feature/otimizacao-deps-hotpaths` na main + deploy** — idealmente na MESMA janela
     do P-019/P-020 (D-014: pode custar re-scan do QR wwebjs se houver sessão wwebjs na frota; hoje
     não há). A migration do índice aplica sozinha (`migrate deploy` no entrypoint).
  2. **No 1º boot pós-deploy:** conferir no log a reconexão da frota Baileys (rc14) e o formato dos
     logs (pino 10). Rollback = reverter o merge e redeployar.
  3. (opcional) Tunar `DB_POOL_MAX` (ex.: 20) e `WEBHOOK_CONCURRENCY` no Dokploy se necessário —
     defaults já são seguros.
- **Não deployei nada** (R0) · **não pushei** (branch local; push na janela do merge).
