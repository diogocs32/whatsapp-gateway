# Base de conhecimento para o agent `whatzapp_api`

> **Propósito**: este documento reúne tudo que um agent especializado precisa saber para
> trabalhar com confiança neste projeto. Use-o como fonte ao **criar o subagent
> `whatzapp_api`** (frota dioggo-stack). Mantenha vivo: ao descobrir novo gargalo, adicione aqui.
>
> Fonte primária complementar: `PROMPT-MESTRE-WHATSAPP-GATEWAY.md` (blueprint, raiz do repo).

---

## 1. Frontmatter sugerido para o agent

```markdown
---
name: whatzapp_api
description: >
  Especialista no projeto WhatsApp Gateway (Node/TS, NestJS+Fastify, Baileys 7.x,
  PostgreSQL/Prisma, Redis/BullMQ, MinIO/S3, dashboard React/Vite). Use para qualquer
  tarefa que toque o gateway: sessões Baileys, criptografia Signal ("Aguardando
  mensagem"), LID multi-device, envio/recebimento de mensagens e mídia, auth state,
  proxies (Webshare), webhooks, SSE, campanhas, migrations Prisma, e operação no WSL.
  Trabalha em pt-BR. Documentation-first: cita fonte (código do Baileys, doc oficial)
  antes de implementar; nunca adivinha versão/API.
tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, WebSearch
---
```

**Identidade**: sênior em Baileys/WhatsApp multi-device e em NestJS+DDD. Pragmático,
cético, valida no código-fonte do Baileys instalado (`node_modules/@whiskeysockets/baileys/lib`)
e compara com o **Evolution API** (referência open-source que usa Baileys) quando útil.

---

## 2. Visão geral

- **Produto**: WhatsApp Gateway self-hosted multi-sessão (comercial).
- **Arquitetura**: Modular Monolith + DDD. Cada módulo tem `domain/`, `application/`,
  `infrastructure/`, `interface/`.
- **Runtime**: **Node 26** (nvm). Projeto roda no **WSL Ubuntu** (`/home/diogocs32/projetos/whatzapp_api`).
- **Monorepo npm workspaces**: `apps/gateway` (backend) + `apps/dashboard` (frontend) + `packages/*`.

### Stack
| Camada | Tecnologia |
|---|---|
| Backend | NestJS 11 + Fastify |
| WhatsApp | **@whiskeysockets/baileys 7.0.0-rc13** (era 6.7.23 — ver §7) |
| DB | PostgreSQL 18 + **Prisma 7** (client gerado em `apps/gateway/src/generated/`) |
| Cache/Fila | Redis 7 + BullMQ |
| Mídia | MinIO / S3 (`@aws-sdk/client-s3`) |
| Frontend | React + Vite 8 (porta 5173) |
| Build | `nest build` (**builder TSC**, não SWC; `.swcrc` é só p/ Vitest) |
| Testes | Vitest |

### Portas e infra (dev)
- Gateway: `http://localhost:3000` (API em `/api`, health em `/health`).
- Dashboard: `http://localhost:5173`.
- Infra via `docker compose`: **postgres:18** (volume em `/var/lib/postgresql`, NÃO `/data`),
  redis:7, minio (`:9000`/`:9001`).
- `DATABASE_URL=postgresql://gateway:gateway@localhost:5432/gateway`.
- Admin dev do dashboard: `admin` / `admin123`.

---

## 3. Mapa de módulos (`apps/gateway/src/modules/`)

`sessions`, `messaging`, `channels`, `groups`, `contacts`, `campaigns`, `proxies`,
`webhooks`, `events` (SSE), `iam` (JWT), `health`.

Infra compartilhada (`apps/gateway/src/infra/`): `prisma`, `redis`, `storage` (S3/MinIO),
`directory` (diretório de contatos LID↔telefone). Shared kernel (`shared-kernel/`):
`event-bus` (desacopla persistência, webhooks e SSE), `domain-event`, `ulid`.

### Arquivos-chave (decorar)
| Arquivo | Papel |
|---|---|
| `modules/sessions/infrastructure/baileys/baileys.engine.ts` | **O coração.** Integra o Baileys: socket, conexão, envio (`sendText`/`sendMedia`), recebimento (`onMessagesUpsert`), `getMessage`, LID, mídia, `BaileysEngineDeps`. ~900 linhas. |
| `modules/sessions/infrastructure/baileys/postgres-auth-state.ts` | Auth state Signal em Postgres (equivale ao `useMultiFileAuthState`). `get/set` genéricos via `BufferJSON`. |
| `modules/sessions/application/session-manager.service.ts` | Cria/gerencia engines por sessão; reidrata no boot (`onApplicationBootstrap`); injeta os callbacks da engine. |
| `modules/sessions/application/engine.port.ts` | `MessagePayload`, `WaEventEnvelope`, `IEngine`, tipos de evento. |
| `modules/messaging/application/message-persister.service.ts` | Assina o EventBus e persiste mensagens (entrada e saída). |
| `modules/messaging/infrastructure/prisma-message.repository.ts` | `save`/`listByChat` de `wa_messages`. |
| `modules/webhooks/application/webhook-dispatcher.service.ts` | Casa eventos↔webhooks e enfileira entrega. |
| `modules/events/interface/events.controller.ts` | Stream SSE (`/api/events/stream`). |
| `modules/proxies/infrastructure/proxy-agent.factory.ts` | Cria o `Agent` (socks/https) para o Baileys. |
| `modules/proxies/infrastructure/webshare.client.ts` | Sync do pool de proxies Webshare. |
| `types/proxy-agents.d.ts` | **Shim de tipos** p/ `socks-proxy-agent`/`https-proxy-agent` (ver §8). |
| `prisma/schema.prisma` | Modelo de dados. |

---

## 4. Modelo de dados (Prisma — tabelas-chave)

- **`WaSession`** (`wa_sessions`): `id, name, engine, status, meJid, mePushName, phoneNumber,
  autostart, creds (Json), metadata, lastError, createdAt, updatedAt`.
  Status possíveis: `STOPPED, STARTING, SCAN_QR_CODE, WORKING, DEGRADED, FAILED`.
- **`WaMessage`** (`wa_messages`): `id, sessionId, keyId, chatJid, senderJid, fromMe, type,
  text, status, raw (Json), mediaType, mimetype, fileName, mediaKey, fileSize, timestamp, createdAt`.
  Índices: `(sessionId, chatJid, timestamp)` e `(sessionId, keyId)`.
  ⚠️ **`raw`** guarda o `proto.IMessage` inteiro (BufferJSON) das mensagens `fromMe` — usado pelo
  `getMessage` no retry (ver §6). `mediaKey` = chave do objeto no **S3** (não a mediaKey Signal).
- **`WaAuthKey`** (`wa_auth_keys`): `sessionId, type, keyId, data`. `@@id([sessionId, type, keyId])`,
  `@@index([sessionId, type])`. Tipos: `pre-key, session, sender-key, app-state-sync-key,
  app-state-sync-version, lid-mapping, device-list, tctoken, identity-key` (7.x).
- `WaContact` (`@@unique([sessionId, waId])`), webhooks, proxies, campaigns.

---

## 5. Fluxos críticos

### Envio (pelo gateway)
`sendText`/`sendMedia` → `sock.sendMessage` → `cacheSent(keyId, sent.message)` (cache em memória,
bounded `SENT_CACHE_MAX`) → emite `onEvent('message', { fromMe:true, raw: encodeProto(sent.message), ... })`
→ EventBus → `MessagePersister` grava em `wa_messages` (incl. `raw`). O Baileys NÃO emite
`messages.upsert` p/ o que o gateway envia; por isso o evento é emitido manualmente.

### Recebimento / mensagens do aparelho (multi-device)
`messages.upsert` (`notify`) → `onMessagesUpsert`. Pula mensagens próprias já em `sentMessages`
(evita duplicar). **Desembrulha** `deviceSentMessage`/ephemeral/viewOnce com `extractMessageContent`
e **ignora protocolo** (`protocolMessage`, `senderKeyDistributionMessage`, conteúdo vazio) via
`getContentType` — senão poluem o inbox como `[other]`.

### Retry de descriptografia ("Aguardando mensagem")
Destinatário não decifra → envia **retry receipt** → Baileys chama `getMessage(key)` →
`loadMessageForRetry`: tenta `sentMessages` (memória), no miss lê `wa_messages.raw` (proto inteiro,
texto E mídia) e decodifica via `BufferJSON`; fallback p/ `{ conversation: text }`. Se retornar
`undefined`, o reenvio falha e a msg trava em "Aguardando" para sempre.

---

## 6. GARGALOS E ARMADILHAS ⚠️ (a parte mais importante)

### 6.1 — "Aguardando mensagem" / criptografia Signal
Causas e correções já aplicadas em `baileys.engine.ts`:
1. **Cache write-through das chaves**: `auth.keys` envolvido em `makeCacheableSignalKeyStore` —
   sem isso, leituras concorrentes veem estado obsoleto e o ratchet dessincroniza.
2. **`getMessage` durável**: lê `wa_messages.raw` (proto inteiro) no retry; só cache em memória
   não basta (some em reconnect/restart/eviction → trava permanente, inclusive mídia).
3. **`transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 }`** — robustez do commit
   das chaves sob carga de campanha (espelha o Evolution).
4. **Persistir o `proto.IMessage` inteiro** em `raw` (não só `text`): `{ conversation }` não
   reenvia **mídia** no retry.

### 6.2 — LID multi-device (causa do bug que motivou a migração)
- O **Baileys 6.7.x tem bug de LID desync**: ao enviar **pelo aparelho** com o gateway companion
  conectado, o destinatário via "Aguardando mensagem". Corrigido na linha **7.x** (migração de LID).
  Log do fix ativo: `"Own LID session created successfully"`.
- O projeto tem código custom LID↔telefone (`lidToPn`, `resolveJid`, `warmLidCache`, §23 do blueprint).
- **APIs 7.x** (diferem do 6.x): `Contact.phoneNumber` (não `Contact.jid`); `m.key.remoteJidAlt`
  (não `m.key.senderPn`) p/ obter o PN quando `remoteJid` é `@lid`; `onWhatsApp()` **não retorna mais
  `lid`** (o LID↔PN é resolvido pelo `lidMapping` interno do Baileys).

### 6.3 — `[other]` no inbox
Mensagens de protocolo/sync (ao parear e ao enviar pelo aparelho) chegam ao companion e, sem filtro,
viram `type:'other'`. Filtrar no `onMessagesUpsert` com `extractMessageContent` + `getContentType`
(ver §5). `chatJid` dessas costuma ser o **próprio número** da sessão.

### 6.4 — `raw` é detalhe interno
Não vaza nos consumidores externos: há `stripRaw` no `webhook-dispatcher.service.ts` e no
`events.controller.ts` (SSE). Não reintroduzir `raw` nesses payloads.

### 6.5 — WSL / execução de comandos
- Executar via: `wsl.exe -d Ubuntu -u diogocs32 -- bash -lc '<comando>'`.
- **Aspas duplas dentro do `'...'` são mangladas** na ponte Git Bash→WSL → comando quebra. Use só
  aspas simples externas; para SQL/JS complexo, **escreva um `.sh`** e rode `bash caminho.sh`
  (o conteúdo do arquivo não passa pela ponte). Em SQL, use dollar-quote `$$texto$$` em vez de aspas simples.
- **Node 26**: shell não-interativo NÃO carrega nvm; `/usr/bin/node` (18) sombreia. Forçar com
  `. $HOME/.nvm/nvm.sh; nvm use 26`. Ou usar `bash scripts/run.sh <cmd>` (não escreve em `dist`).
- O `cd` inline às vezes falha (cwd vira UNC `//wsl.localhost/...`); prefira caminhos absolutos
  ou `cd` dentro de um `.sh`.

### 6.6 — Churn de `nest start --watch`
`npm run dev` roda o gateway sob `nest start --watch` → **recompila e reinicia a cada save de `.ts`**.
Com uma sessão WhatsApp **real conectada**, a rajada de restarts dessincroniza/derruba a sessão Signal
(Bad MAC, "init queries Timed Out"). As creds persistem no Postgres (reconectar = só "Iniciar"), mas
**para trabalho cirúrgico: pare a stack, edite em lote, suba UMA vez no fim.** Para validar sem reiniciar:
`bash scripts/verify-proxies.sh` / `curl localhost:3000/health` / `bash scripts/diag-aguardando.sh`.

### 6.7 — `pkill -f` inline se auto-mata
`pkill -f "nest start"` digitado inline casa a **própria linha de comando** (que contém "nest start")
e mata o shell (exit 9). Sempre rode pkills **de dentro de um `.sh`** (cmdline vira `bash x.sh`).

### 6.8 — Build / TypeScript
- **NUNCA** rodar `nest build` com `nest start --watch` ativo — ambos escrevem o MESMO `dist` →
  `ENOTEMPTY` e `dist` incompleto (app morre com `Cannot find module './bootstrap/config'`).
- `tsconfig` tem `incremental:true` → o erro fica cacheado em `apps/gateway/dist/tsconfig.tsbuildinfo`.
  Antes de validar com tsc: **`rm -rf apps/gateway/dist`**. Para typecheck sem escrever dist:
  `bash scripts/run.sh npx tsc --noEmit -p apps/gateway/tsconfig.json`.
- `moduleResolution: "node"` (legacy) **não lê o campo `exports`** dos pacotes. Pacotes exports-only
  (ex.: `https-proxy-agent@9`, `socks-proxy-agent@10`) não resolvem tipos → usar o **shim**
  `apps/gateway/src/types/proxy-agents.d.ts`. Não dá p/ mudar `moduleResolution` mantendo `module:commonjs`.

### 6.9 — ESM vs CommonJS (Baileys 7.x)
O Baileys 7.x é **ESM-only** (`type:module`), mas o **Node 26 faz `require()` de ESM** — então os
imports do projeto (compilados p/ CJS) funcionam **sem mudança** e sem dynamic import. Validar com
um `.cjs` de teste se em dúvida. NÃO há top-level await que quebre o require.

### 6.10 — `findAutostart` só reidrata sessões ativas
`prisma-session.repository.ts#findAutostart` filtra `autostart:true` **E** `status in
(WORKING, STARTING, SCAN_QR_CODE, ...)`. Sessão deixada em **STOPPED** NÃO reidrata no boot;
iniciar via API `POST /api/sessions/:id/start` (precisa JWT — ver `scripts/start-session.sh`).

### 6.11 — Proxy NÃO é a causa do "Aguardando"
Já investigado e **descartado**: o proxy (Webshare, socks/https em `agent` e `fetchAgent`) não causa
a falha de descriptografia. A causa era LID/versão. Não perder tempo nessa pista de novo.

### 6.12 — `npm install` e deps des-hoisted
Instalar um pacote pode des-hoist/remover deps (ex.: `https-proxy-agent` sumiu ao instalar o baileys 7).
Após mexer em deps: confirmar `node_modules/<pkg>` e, se faltar declarada, `npm install <pkg> -w apps/gateway`.

---

## 6B. GARGALOS DE DEPLOY EM PRODUÇÃO (Dokploy) ⚠️

> Saga de subir em produção (2026-06-21). Passo a passo completo em `docs/deploy-dokploy.md`.
> Topologia: **2 Applications** (gateway `api.conexozenvo.com`:3000, dashboard `conexozenvo.com`:80) +
> **Databases** gerenciados (Postgres, Redis). Cada erro abaixo custou um ciclo de deploy — decore.

### 6B.1 — Application (não Compose) + Build Type Dockerfile
- Use **Application** (não Docker Compose): dá backup de DB, domínio/SSL automáticos, healthcheck/rollback
  por app. Postgres/Redis = recursos **Database** (gerenciados); gateway/dashboard = **Application**.
- **Build Type = Dockerfile** (não Nixpacks). Sintoma Nixpacks: `Error: No start command could be found`
  (a raiz do monorepo não tem `start`). Trocar em **General → Build Type → Dockerfile**.

### 6B.2 — Dockerfile Path × Context (não inverter)
- **Dockerfile Path** = `apps/gateway/Dockerfile` (o ARQUIVO, relativo ao Context).
- **Docker Context Path** = `.` (a PASTA = raiz do monorepo). Tem que ser a raiz: os Dockerfiles fazem
  `COPY package.json`, `COPY apps/...`, `COPY packages/contracts/...`.
- Sintomas: `open Dockerfile: no such file` (Path vazio) · `cd: can't cd to .../Dockerfile` (puseram o
  arquivo no campo Context).

### 6B.3 — Conexão Postgres/Redis: use as PARTES, não a URL
- O app aceita `DATABASE_URL`/`REDIS_URL` **OU** as partes (`DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/
  DB_SSL`, `REDIS_HOST/REDIS_PORT/REDIS_USERNAME/REDIS_PASSWORD/REDIS_DB`). **A URL tem prioridade se setada.**
- **Prefira as partes** — `config.ts` (runtime, PrismaPg/ioredis) e `prisma.config.ts` (migrate) montam a
  URL com encode. Motivo: senha do Dokploy costuma ter `@ : / # { }` que quebram a URL.
- Sintomas resolvidos pelas partes: `NOAUTH Authentication required` (Redis com senha) ·
  `P1013: scheme not recognized` (DATABASE_URL sem `postgresql://`, ou começando com `//`, ou senha não-escapada).
- ⚠️ Se `DATABASE_URL`/`REDIS_URL` ficar setada com valor inválido, ela tem prioridade e quebra tudo →
  **apague-a** e use só as partes. Host = NOME DO SERVIÇO interno (ex.: `campanha-dbname-xxxx`), nunca localhost.

### 6B.4 — BullMQ precisa da senha do Redis (helper central)
- As filas (webhooks, campanhas) montavam a connection só com host/port (sem senha) → `NOAUTH` em Redis
  autenticado. Centralizado em **`infra/redis/redis-connection.ts`** (`redisConnection()`), usado por
  `RedisService`, `webhook-queue` e `campaign-queue`. **Qualquer nova fila DEVE usar esse helper.**

### 6B.5 — Healthcheck + IPv6 (causa de 502 no dashboard)
- No container `localhost` resolve para `::1` (IPv6). Se o serviço só faz `listen 80` (IPv4) e o
  healthcheck usa `wget http://localhost/`, o **wget do BusyBox não faz fallback p/ IPv4** → check falha →
  container **unhealthy** → Swarm reinicia em loop → Traefik **502**.
- Correção: nginx do dashboard com `listen [::]:80` **e** healthchecks usando **`127.0.0.1`** (não
  `localhost`). O gateway usa `curl` (faz fallback IPv6→IPv4 sozinho) — por isso nunca quebrou, mas também
  foi p/ 127.0.0.1 por robustez.
- Container unhealthy = Traefik tira do balanceador = 502 (mesmo com o processo no ar).

### 6B.6 — `VITE_API_URL` é BUILD-TIME (causa de 405 no login)
- O dashboard é Vite estático: `VITE_API_URL` é **embutido no bundle durante `npm run build`** → tem que ir
  em **Build-time Arguments** (NÃO Environment runtime). O Dockerfile já tem `ARG VITE_API_URL`.
- Sintoma: `POST https://conexozenvo.com/api/auth/login 405 (Method Not Allowed)` — o front chama o PRÓPRIO
  domínio (BASE vazio → caminho relativo) e o nginx recusa POST. = `VITE_API_URL` não foi embutido. Corrigir
  o Build Arg e **rebuildar** (não só restart). Valor: `https://api.conexozenvo.com`. Conferir no DevTools→Network.

### 6B.7 — Migrations e reset do banco
- `docker-entrypoint.sh` roda **`prisma migrate deploy`** no start: cria as TABELAS (não o database). O
  database precisa existir; aplica só as migrations de `prisma/migrations`.
- Build do gateway tem `ENV DATABASE_URL=postgresql://build:build@localhost:5432/build` (dummy) **só no
  stage build** (o `prisma generate` exige a var mas não conecta). Runtime usa a env do Dokploy.
- **Reset total**: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` (limpa tabelas **e**
  `_prisma_migrations`). Se deixar `_prisma_migrations`, o migrate "acha" que aplicou e NÃO recria → app quebra.

### 6B.8 — Admin só no 1º boot + reset de senha
- `AdminSeeder` (`onApplicationBootstrap`) cria o admin **só se `count()==0`**, com `DASHBOARD_USERNAME`
  (default `admin`) + `DASHBOARD_PASSWORD`. **Mudar a senha depois NÃO atualiza** o admin existente.
- "Credenciais inválidas" = senha ≠ a do admin (cuidado com **aspas/espaços** no Environment) ou usuário ≠ `admin`.
- Reset sem depender do seeder (hash scrypt `salt:derived`, ver `shared-kernel/crypto.ts`):
  ```sql
  INSERT INTO "User" (id, username, name, "passwordHash", role, "createdAt", "updatedAt")
  VALUES ('<id>','admin','Administrador','<salt:derived>','OWNER',now(),now())
  ON CONFLICT (username) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash";
  ```
  Gerar hash: `node -e "const{scrypt,randomBytes}=require('crypto');const s=randomBytes(16).toString('hex');scrypt('SENHA',s,64,(e,d)=>console.log(s+':'+d.toString('hex')))"`
- ⚠️ Tabela é **`"User"`** (PascalCase) — SQL precisa de **aspas duplas** (`DELETE FROM "User"`, não `User`).
- ⚠️ **TablePlus externo pode estar em outro banco** que não o da API → mudança não reflete. Use o terminal
  do **serviço Postgres do Dokploy** (banco interno que a API usa). Isolar dashboard×credencial testando a
  API direto: `curl -X POST https://api.conexozenvo.com/api/auth/login -d '{"username":"admin","password":"..."}'`
  → **401** = credencial errada · **405** = front apontando pro domínio errado · **token** = ok.

### 6B.9 — Portas, domínios, CORS, DNS
- **Container Port**: gateway **3000**, dashboard **80** (nginx). Porta errada no domínio → **502**.
- `CORS_ORIGIN` = domínio do **dashboard** (ex.: `https://conexozenvo.com`). DNS: registros A p/ `@` e `api`.
- App escuta `0.0.0.0` (ok p/ container). `/` no gateway = 404 (é API; rotas em `/api/*` e `/health`).

### 6B.10 — Memória: Chromium deixa o gateway `degraded`
- A imagem do gateway inclui **Chromium** (engine WWEBJS) → RAM alta; `/health` fica `degraded`
  (`heapUsedPct` ~0.9+). Aumentar a RAM do container **ou**, se usar só Baileys, remover
  `chromium`/`fonts-liberation` do `apt-get` em `apps/gateway/Dockerfile`. `WWEBJS_DATA_PATH=/data/wwebjs`
  precisa de **volume persistente** (senão re-pareia a cada deploy).

---

## 7. Histórico de decisões importantes

- **2026-06-21 — Migração Baileys 6.7.23 → 7.0.0-rc13** para corrigir o "Aguardando mensagem"/LID
  multi-device. Escopo real foi pequeno: ESM ok no Node 26; 4 ajustes de API (§6.2); auth state e
  `proto.fromObject` inalterados; creds 6.x reconectam sem re-QR. Validado em produção local
  (gateway rodou ~6,6h estável). Backup do 6.x em `.migration-backup-v7/` (gitignored).
- Antes da migração foram aplicados os fixes de §6.1, §6.3, §6.4 (ainda válidos no 7.x).
- **2026-06-21 — Merge automático de LID no WWEBJS**: `message_create` (capta enviadas de qualquer
  device) + `resolveNumberJid` via `window.WWebJS.enforceLidAndPnRetrieval` + `getContact` (o `window.Store`
  não é exposto no whatsapp-web.js 1.34) + merge retroativo (`mergeExistingLids` no boot). Unifica
  conversas que ficavam divididas entre `@lid` (recebidas) e `<tel>@c.us` (enviadas).
- **2026-06-21 — Conexão Postgres/Redis por partes** (`DB_*`/`REDIS_*`) além da URL; helper
  `infra/redis/redis-connection.ts` para o BullMQ. Ver §6B.3 / §6B.4.
- **2026-06-21 — Primeiro deploy em produção (Dokploy)** — `conexozenvo.com` (dashboard) +
  `api.conexozenvo.com` (gateway). Criados `apps/*/Dockerfile` + `docker-entrypoint.sh` (migrate deploy) +
  `nginx.conf`. Gargalos consolidados em §6B; guia em `docs/deploy-dokploy.md`. Roadmap de motores e por que
  NÃO embutir WAHA/Evolution/Z-API (são concorrentes, não engines) em `docs/motores-whatsapp.md`.

---

## 8. Operação rápida (cheatsheet)

```bash
# subir tudo (gateway + dashboard) — no terminal do usuário
npm run dev

# typecheck sem tocar dist
bash scripts/run.sh npx tsc --noEmit -p apps/gateway/tsconfig.json

# status das sessões (psql)
bash scripts/status.sh

# iniciar a sessão campanha1 via API (login admin + start)
bash scripts/start-session.sh

# diagnóstico read-only do "Aguardando mensagem"
bash scripts/diag-aguardando.sh

# migration Prisma
npm run prisma:migrate -w apps/gateway -- --name <nome>
```

Scripts úteis em `scripts/`: `run.sh` (Node 26 wrapper, não escreve dist), `dev.sh`,
`verify-proxies.sh`, `status.sh`, `start-session.sh`, `diag-aguardando.sh`.

---

## 9. Política de trabalho do agent (regras fortes)

1. **Documentation-first**: antes de afirmar comportamento do Baileys, ler o código instalado em
   `node_modules/@whiskeysockets/baileys/lib/**` (é a fonte de verdade) e/ou a doc oficial
   (`baileys.wiki`, repo `WhiskeySockets/Baileys`). Comparar com o **Evolution API** quando útil.
   Nunca adivinhar versão/API.
2. **Não editar `.ts` do gateway com sessão real conectada** sem avisar do churn (§6.6).
3. **Verificar segredos** antes de qualquer commit: `.env`/`.env.*` são gitignored; nunca versionar
   chave Webshare, JWT_SECRET real, tokens.
4. **Validar mudanças** com typecheck (limpando `dist` antes) e, quando possível, runtime
   (`curl /health`, status da sessão no banco).
5. Trabalhar em **pt-BR**; comentários no código em pt-BR (padrão do projeto).

---

## 10. Referências externas

- Baileys: https://github.com/WhiskeySockets/Baileys · doc: https://baileys.wiki ·
  migração v7: https://baileys.wiki/docs/migration/to-v7.0.0/
- Issues relevantes (LID/"waiting for this message"): #1964, #1718, #2342, #1701, #1767.
- Evolution API (referência open-source que usa Baileys): https://github.com/EvolutionAPI/evolution-api
- Blueprint do projeto: `PROMPT-MESTRE-WHATSAPP-GATEWAY.md` (raiz).
- Repositório: https://github.com/diogocs32/whatsapp-gateway (privado).
