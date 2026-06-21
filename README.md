# WhatsApp Gateway

Plataforma self-hosted multi-sessão de WhatsApp (engine **Baileys**), **Modular Monolith + DDD**.
Blueprint completo do produto: **[`PROMPT-MESTRE-WHATSAPP-GATEWAY.md`](./PROMPT-MESTRE-WHATSAPP-GATEWAY.md)**.

Estado atual: **Fase F2 concluída** (a + b). F0 (fundação) + F1 (sessão + QR/pairing + auth store Postgres) + F2a (enviar/receber texto, `getMessage`, resolução JID BR + LID, Inbox, Event Monitor SSE) + F2b (webhooks: BullMQ + HMAC SHA-512 + retries + UI). Suíte de qualidade (ESLint + Prettier + Vitest e2e, 16 testes). Próximo: F3 (proxies + faixas por instância + Webshare).

---

## Stack (versões confirmadas na doc oficial)

| Camada     | Versão                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| Runtime    | Node **26.3.1**                                                                                            |
| Backend    | NestJS **11.1.27** (adapter Fastify **5.8.5**)                                                             |
| Config/JWT | `@nestjs/config` **4.0.4** · `@nestjs/jwt` **11.0.2**                                                      |
| ORM        | **Prisma 7.8.0** (generator `prisma-client` + driver adapter `@prisma/adapter-pg`)                         |
| DB / Cache | PostgreSQL **18** · Redis **7** (`ioredis` 5.11)                                                           |
| Frontend   | React **19** · Vite **8.0.13** · `@vitejs/plugin-react` **6** · Tailwind **4.3.1** · react-router **7.18** |

---

## Pré-requisitos

- **Node 26** (versão atual; mínimo técnico Node ≥ 22.12). No WSL, via nvm:
  ```bash
  nvm install 26 && nvm alias default 26 && nvm use 26
  node -v   # v26.x
  ```
- **Docker** + Docker Compose (para Postgres/Redis/MinIO).

---

## Subir o ambiente (rodar no terminal WSL)

```bash
# 1. Instalar dependências (npm workspaces)
npm install

# 2. Subir infraestrutura local (Postgres + Redis + MinIO)
npm run infra:up

# 3. Configurar variáveis de ambiente
cp apps/gateway/env.example   apps/gateway/.env
cp apps/dashboard/env.example apps/dashboard/.env

# 4. Gerar o Prisma Client e criar o schema (tabela users)
npm run gateway:generate
cd apps/gateway && npx prisma migrate dev --name init && cd ../..

# 5. Rodar gateway (3000) + dashboard (5173) juntos
#    Use o script (garante Node 26 mesmo se o shell estiver no Node do sistema):
bash scripts/dev.sh
#    (ou `npm run dev` direto, se `node -v` já mostrar v26 no seu terminal)
```

Depois:

- Painel: **http://localhost:5173** → login **`admin` / `admin123`** (definidos em `apps/gateway/.env`).
- Health (JSON): `curl http://localhost:3000/health`
- API: `http://localhost:3000/api/...`

> O card **"Saúde do sistema"** no painel atualiza a cada 5s mostrando PostgreSQL e Redis ao vivo — é o teste visual da F0.

---

## Scripts úteis (raiz)

| Comando                           | O que faz                                                           |
| --------------------------------- | ------------------------------------------------------------------- |
| `npm run infra:up` / `infra:down` | sobe/derruba Postgres+Redis+MinIO                                   |
| `npm run gateway:dev`             | só o backend (watch)                                                |
| `npm run dashboard:dev`           | só o frontend                                                       |
| `npm run gateway:generate`        | regenera o Prisma Client                                            |
| `npm run gateway:migrate`         | `prisma migrate dev`                                                |
| `npm run dev`                     | backend + frontend juntos                                           |
| `npm run lint` / `lint:fix`       | ESLint (typescript-eslint + react-hooks)                            |
| `npm run format`                  | Prettier (formata o repo)                                           |
| `npm run test`                    | testes e2e do gateway (Vitest) — requer `infra:up` (Postgres/Redis) |

---

## Estrutura

```
apps/
  gateway/                 # NestJS (Fastify) — Modular Monolith + DDD
    prisma/schema.prisma
    src/
      bootstrap/           # config + validação de env (zod)
      shared-kernel/       # Result, ULID, Clock, Crypto, EventBus
      infra/               # PrismaService (adapter pg), RedisService
      modules/
        health/            # GET /health
        iam/               # login admin (domain/application/infrastructure/interface)
  dashboard/               # React + Vite + Tailwind (login + shell + card de saúde)
packages/
  contracts/               # tipos compartilhados backend↔frontend
docker-compose.yml         # infra de dev
```

---

## Notas

- **O Prisma Client é gerado** em `apps/gateway/src/generated/prisma` (gitignored). Antes de `npm run gateway:generate`, o editor acusa erro no import `../../generated/prisma/client` — é **esperado** e some após gerar.
- Prisma 7 é ESM por padrão; usamos `moduleFormat = "cjs"` no generator para casar com o NestJS (CommonJS).
- Hash de senha usa `scrypt` nativo do Node (zero dependências).

## Próxima fase

**F3 — Proxies (diferencial): pool com `position` estável, faixas por instância (ex.: 1–10, 5–10), estratégias de rotação, health-test e sync automático do Webshare.** Ver roadmap no blueprint (§7, §20).
