# WhatsApp Gateway

Plataforma self-hosted multi-sessão de WhatsApp (engine **Baileys**), **Modular Monolith + DDD**.
Blueprint completo do produto: **[`PROMPT-MESTRE-WHATSAPP-GATEWAY.md`](./PROMPT-MESTRE-WHATSAPP-GATEWAY.md)**.

> **Estado atual: F0 → F6 + F7 (observability/isolamento) + F8 (engine plugável) concluídas.**
> Sessões, mensagens texto + webhooks + Event Monitor (SSE), **proxies** (faixas/rotação/sticky/
> Webshare), **mídia** (S3/MinIO), **grupos/contatos/canais**, **campanhas** (BullMQ + anti-ban),
> **observability** (`/metrics` Prometheus + tela Logs & saúde + isolamento de falhas) e **engine
> plugável** (Baileys **ou** whatsapp-web.js por sessão). **Próxima: F9 — IAM completo + licença +
> deploy.** (F7.3 — sharding multi-processo — adiada para quando o volume exigir.)
>
> **Manutenção recente:** engine migrada para **Baileys 7.0.0-rc13** — corrige o bug de **LID
> multi-device** (mensagens enviadas pelo aparelho que apareciam como "Aguardando mensagem" no
> destinatário). Detalhes em [`docs/agent-whatzapp_api.md`](./docs/agent-whatzapp_api.md).

---

## Roadmap (ver §20 do blueprint)

| Fase      | Escopo                                                                         | Status                                   |
| --------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| **F0**    | Fundação (monorepo, NestJS+Fastify, Postgres/Redis, EventBus, IAM mínimo)      | ✅                                       |
| **F1**    | Sessão + QR/Pairing + Auth store Postgres + reconexão                          | ✅                                       |
| **F2**    | Mensagens texto + webhooks (HMAC/retries) + Event Monitor (SSE)                | ✅                                       |
| **F3** ⭐ | Proxy + Webshare + faixas por instância + rotação/sticky/health-test           | ✅                                       |
| **F4**    | Mídia (imagem/vídeo/voz/doc) + storage S3/MinIO + download on-demand           | ✅                                       |
| **F5**    | Grupos / Contatos (`onWhatsApp` BR + LID) / Canais (newsletter)                | ✅                                       |
| **F6**    | Campanhas + anti-ban (BullMQ, rate-limit por chip, humanização, relatório)     | ✅                                       |
| **F7**    | Observability (`/metrics`, timeline, tela Logs & saúde) + isolamento de falhas | 🟡 F7.1+F7.2 ✅ · F7.3 (sharding) adiada |
| **F8**    | Engine plugável: WWebJS (whatsapp-web.js) por sessão, mesmo `IEngine`          | ✅                                       |
| **F9**    | IAM completo (RBAC, team seats, API keys) + licença offline + deploy Dokploy   | ⏳ **próxima**                           |

---

## Stack (versões confirmadas)

| Camada     | Versão                                                                           |
| ---------- | -------------------------------------------------------------------------------- |
| Runtime    | Node **26.3.1**                                                                  |
| Backend    | NestJS **11** (adapter Fastify **5**)                                            |
| WhatsApp   | **@whiskeysockets/baileys 7.0.0-rc13**                                           |
| Config/JWT | `@nestjs/config` **4** · `@nestjs/jwt` **11**                                    |
| ORM        | **Prisma 7.8** (generator `prisma-client` + driver adapter `@prisma/adapter-pg`) |
| DB / Cache | PostgreSQL **18** · Redis **7** (`ioredis` 5) · filas **BullMQ**                 |
| Mídia      | MinIO / S3 (`@aws-sdk/client-s3`)                                                |
| Frontend   | React **19** · Vite **8** · Tailwind **4** · react-router **7**                  |

---

## Pré-requisitos

- **Node 26.10.0 / npm 11.19.1** (versões do CI e das imagens; mínimo técnico Node ≥ 22.12). No WSL, via nvm:
  ```bash
  nvm install 26.10.0 && nvm alias default 26.10.0 && nvm use 26.10.0
  node -v   # v26.10.0
  ```
- **Docker** + Docker Compose (para Postgres/Redis/MinIO).

---

O `allowScripts` da raiz registra cada script de instalação por versão. Dependência nova
ou atualizada exige revisão dessa lista; o CI e os Dockerfiles recusam script sem decisão.
O download automático do Puppeteer está negado: WWEBJS usa Chromium instalado separadamente
via `WWEBJS_CHROME_PATH` (a imagem já configura `/usr/bin/chromium`). No ensaio sintético
`scripts/medir-wwebjs-memoria-local.mjs`, informe esse caminho para usar o Chrome local.

## Subir o ambiente (rodar no terminal WSL)

```bash
# 1. Instalar dependências (npm workspaces)
npm ci --strict-allow-scripts

# 2. Subir infraestrutura local (Postgres + Redis + MinIO)
npm run infra:up

# 3. Configurar variáveis de ambiente
cp apps/gateway/env.example   apps/gateway/.env
cp apps/dashboard/env.example apps/dashboard/.env

# 4. Gerar o Prisma Client e aplicar as migrations
npm run gateway:generate
npm run gateway:migrate          # prisma migrate dev

# 5. Rodar gateway (3000) + dashboard (5173) juntos
#    Use o script (garante Node 26 mesmo se o shell estiver no Node do sistema):
bash scripts/dev.sh
#    (ou `npm run dev` direto, se `node -v` já mostrar v26 no seu terminal)
```

Depois:

- Painel: **http://localhost:5173** → login **`admin` / `admin123`** (definidos em `apps/gateway/.env`).
- Health (JSON): `curl http://localhost:3000/health`
- API: `http://localhost:3000/api/...`

> ⚠️ Com uma **sessão WhatsApp real conectada**, evite editar arquivos `.ts` do gateway: o
> `nest start --watch` reinicia o processo a cada save e a rajada de restarts pode dessincronizar a
> sessão Signal. Para trabalho cirúrgico: pare a stack, edite em lote, suba uma vez. (Ver
> `docs/agent-whatzapp_api.md`.)

---

## Scripts úteis (raiz)

| Comando                           | O que faz                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run infra:up` / `infra:down` | sobe/derruba Postgres+Redis+MinIO                                                                                                                      |
| `npm run dev`                     | backend + frontend juntos                                                                                                                              |
| `npm run gateway:dev`             | só o backend (watch)                                                                                                                                   |
| `npm run dashboard:dev`           | só o frontend                                                                                                                                          |
| `npm run gateway:generate`        | regenera o Prisma Client                                                                                                                               |
| `npm run gateway:migrate`         | `prisma migrate dev`                                                                                                                                   |
| `npm run lint` / `lint:fix`       | ESLint (typescript-eslint + react-hooks)                                                                                                               |
| `npm run format`                  | Prettier (formata o repo)                                                                                                                              |
| `npm run test`                    | testes do gateway (unit+e2e, Vitest — requer `infra:up`) + do painel (sem infra)                                                                       |
| `npm run test:unit`               | só os testes sem infra (unit do gateway + painel); filtrar por arquivo: `-w apps/gateway -- <arquivo>` / `npm run test -w apps/dashboard -- <arquivo>` |
| `bash scripts/status.sh`          | status das sessões (psql)                                                                                                                              |
| `bash scripts/diag-aguardando.sh` | diagnóstico read-only de descriptografia/"Aguardando mensagem"                                                                                         |

---

## Estrutura

```
apps/
  gateway/                 # NestJS (Fastify) — Modular Monolith + DDD
    prisma/schema.prisma
    src/
      bootstrap/           # config + validação de env (zod)
      shared-kernel/       # EventBus, ULID, Result, Clock, Crypto
      infra/               # prisma (adapter pg), redis, storage (S3/MinIO), directory (LID↔tel)
      modules/             # cada módulo: domain / application / infrastructure / interface
        health/            # GET /health
        iam/               # login admin (JWT)
        sessions/          # engine Baileys, QR/pairing, auth store PG, máquina de estados
        messaging/         # enviar/receber texto, getMessage, persistência
        webhooks/          # dispatcher (BullMQ + HMAC + retries)
        events/            # Event Monitor (SSE)
        proxies/           # pool, faixas, rotação, sticky, health-test, Webshare
        groups/            # grupos
        contacts/          # contatos (onWhatsApp BR + LID) + diretório
        channels/          # canais (newsletter)
        campaigns/         # campanhas (BullMQ, rate-limit, humanização)
  dashboard/               # React + Vite — Sessions, Inbox, Monitor, Proxies, Groups,
                           # Contacts, Campaigns, Webhooks, Dashboard, Login
packages/
  contracts/               # tipos compartilhados backend↔frontend
docker-compose.yml         # infra de dev (Postgres 18 + Redis 7 + MinIO)
docs/
  agent-whatzapp_api.md    # base de conhecimento do projeto (arquitetura + gargalos)
```

---

## Notas

- **O Prisma Client é gerado** em `apps/gateway/src/generated/prisma` (gitignored). Antes de
  `npm run gateway:generate`, o editor acusa erro no import gerado — é **esperado** e some após gerar.
- Prisma 7 é ESM por padrão; usamos `moduleFormat = "cjs"` no generator para casar com o NestJS.
- Baileys 7.x é ESM-only, mas o **Node 26 faz `require()` de ESM** — os imports do gateway (CJS) funcionam sem mudança.
- Hash de senha usa `scrypt` nativo do Node (zero dependências).

---

## Próxima fase

**F9 — IAM completo + Licença + Deploy**: RBAC, team seats (5 vagas), API keys, licença offline
e deploy no Dokploy (white-label). Ver §20 do blueprint.

> **Pendência da F7:** F7.3 (sharding / process pool multi-processo) foi adiada — o critério da
> F7 (métricas visíveis + crash de 1 sessão não derruba as outras) já é atendido pela F7.1/F7.2
> no modelo single-process. Retomar quando o volume de sessões justificar (blueprint §8.2).
