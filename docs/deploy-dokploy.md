# Deploy no Dokploy — gateway + dashboard

> Baseado na doc oficial do Dokploy. Dois apps separados (backend e frontend), Postgres e Redis
> gerenciados pelo Dokploy, storage de mídia em S3 (Cloudflare R2 / Backblaze B2).
> Domínios: `api.conexozenvo.com` (gateway) e `app.conexozenvo.com` (dashboard).

## 0. Pré-requisitos
- Servidor com Dokploy instalado.
- DNS apontando para o IP do servidor: `@`, `api`, `app` (registros A).
- **Migrations Prisma commitadas** em `apps/gateway/prisma/migrations` (o deploy roda `migrate deploy`,
  que NÃO cria migrations — só aplica as existentes).

## 1. Bancos gerenciados (no Dokploy)
Crie no Dokploy um **PostgreSQL** e um **Redis**. Anote as connection strings (internas, pelo nome do
serviço). Elas vão nas envs do gateway (`DATABASE_URL`, `REDIS_URL`).

## 2. App: gateway (backend)
**Source**: este repositório · **Build Type**: Dockerfile
- **Dockerfile Path**: `apps/gateway/Dockerfile`
- **Docker Context Path**: `.` (raiz do monorepo)

**Environment** (runtime) — use o `apps/gateway/env.production.example` como base. Mínimo:
```
NODE_ENV=production
PORT=3000
DB_HOST=...  DB_PORT=5432  DB_USER=...  DB_PASSWORD=...  DB_NAME=...   # Postgres do Dokploy (partes)
REDIS_HOST=...  REDIS_PORT=6379  REDIS_PASSWORD=...                    # Redis do Dokploy (partes)
JWT_SECRET=...                           # openssl rand -hex 32
API_KEY=...                              # openssl rand -hex 24
DASHBOARD_PASSWORD=...                   # senha forte
CORS_ORIGIN=https://app.conexozenvo.com
WA_LOG_LEVEL=warn
S3_ENDPOINT=... S3_REGION=... S3_BUCKET=... S3_ACCESS_KEY=... S3_SECRET_KEY=... S3_FORCE_PATH_STYLE=true
WWEBJS_DATA_PATH=/data/wwebjs
```

**Domains**: `api.conexozenvo.com` → porta **3000**, HTTPS On, certificado **letsencrypt**.

**Advanced → Volumes/Mounts** (persistir a sessão do WWEBJS):
- Tipo **Volume Mount** · Name `gateway-wwebjs` · Mount Path `/data/wwebjs`

**Advanced → Swarm Settings → Health Check** (zero-downtime):
```json
{ "Test": ["CMD","curl","-f","http://localhost:3000/health"],
  "Interval": 30000000000, "Timeout": 10000000000, "StartPeriod": 60000000000, "Retries": 3 }
```
> Valores em nanosegundos (30s / 10s / 60s). StartPeriod 60s cobre boot do Nest + migrations + Chrome.

**Advanced → Swarm Settings → Update Config** (rolling sem downtime):
```json
{ "Parallelism": 1, "Delay": 10000000000, "FailureAction": "rollback", "Order": "start-first" }
```

> As migrations rodam sozinhas no start (o entrypoint chama `prisma migrate deploy` antes do app).
> Mantenha **1 réplica** (a sessão do WhatsApp é stateful — volume local ao nó).

## 3. App: dashboard (frontend)
**Build Type**: Dockerfile
- **Dockerfile Path**: `apps/dashboard/Dockerfile` · **Context**: `.`

**Environment → Build Time Arguments** (⚠️ build-time, não runtime):
```
VITE_API_URL=https://api.conexozenvo.com
```
**Domains**: `app.conexozenvo.com` → porta **80**, HTTPS On, letsencrypt.

## 4. WebSocket / SSE (Event Monitor)
O Traefik do Dokploy faz upgrade de WebSocket automaticamente. Para o **SSE** não bufferizar, adicione
em **Advanced → Labels** do gateway (ajuste `<service>` ao nome gerado):
```
traefik.http.services.<service>.loadBalancer.responseForwarding.flushInterval=100ms
```
> Não documentado explicitamente pelo Dokploy — é config padrão do Traefik. Ref: doc do Traefik (Services).

## 5. Ordem de subida
1. Postgres + Redis (e aguardar healthy).
2. Gateway (deploy → confere `/health` em `https://api.conexozenvo.com/health`).
3. Dashboard (deploy → abre `https://app.conexozenvo.com`, login admin).

## Troubleshooting

**`Error: No start command could be found` / `Nixpacks build failed`**
O app está usando **Nixpacks** (build type padrão), não o Dockerfile — e a raiz do monorepo não tem
um `start`. Corrija na Application → aba **General** → campo **Build Type** → selecione **Dockerfile**.
Aparecem 3 campos; preencha:
- **Dockerfile Path** (obrigatório): `apps/gateway/Dockerfile` (ou `apps/dashboard/Dockerfile`)
- **Docker Context Path**: `.`
- **Docker Build Stage**: (deixe vazio)

Depois **Save** → **Deploy**. O `Dockerfile Path` é relativo ao Context. Para o dashboard, o
`VITE_API_URL` vai na aba **Environment → Build Time Arguments** (não nos campos acima).

## Notas
- Imagem do gateway inclui **Chromium** (engine WWEBJS). Para usar só Baileys, edite o `apt-get` do
  `apps/gateway/Dockerfile` (remova `chromium` e `fonts-liberation`) — fica bem menor.
- Build via CI/CD (GitHub Actions → imagem pré-pronta) é o ideal de produção segundo a doc (o servidor
  só faz deploy, sem gastar CPU/RAM em build). Começar com build no Dokploy é aceitável.
