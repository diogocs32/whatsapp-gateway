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

**Advanced → Volumes/Mounts** — ⚠️ **PASSO CRÍTICO** (persistir a sessão do WWEBJS):

- Tipo **Volume Mount** · Name `gateway-wwebjs` · Mount Path `/data/wwebjs`
- **Sem este mount, o LocalAuth do wwebjs vive no filesystem EFÊMERO do container e TODA troca
  de container (qualquer deploy) apaga o perfil → o WhatsApp exige QR de novo.** Foi exatamente
  a P-015 (6+ re-pareamentos em 13-14/08): o passo ficou de fora na configuração original e só
  foi aplicado em **14/08/2026** (volume criado + redeploy; prova no log do boot:
  `[entrypoint] corrigindo dono de /data/wwebjs para node`).

**Advanced → Swarm Settings → Health Check** — ⚠️ **deixar VAZIO** enquanto a issue Dokploy
[#5171](https://github.com/Dokploy/dokploy/issues/5171) estiver aberta (o campo grava `Test` como
string única, o Docker rejeita o healthcheck e as tasks ficam presas em `Starting`; aberta em
24/08/2026, ainda aberta em 25/09/2026). O HEALTHCHECK do `apps/gateway/Dockerfile` continua
valendo. O JSON abaixo fica só como referência de formato — não colar enquanto o #5171 existir:

```json
{
  "Test": ["CMD", "curl", "-f", "http://localhost:3000/health"],
  "Interval": 30000000000,
  "Timeout": 10000000000,
  "StartPeriod": 60000000000,
  "Retries": 3
}
```

> Valores em nanosegundos (30s / 10s / 60s). StartPeriod 60s cobre boot do Nest + migrations + Chrome.

**Advanced → Swarm Settings → Update Config e Rollback Config** — ⚠️ **PREENCHER os DOIS com
`stop-first`. NÃO deixar vazio.** Ação do dono: **B-004** em [PENDENCIAS.md](PENDENCIAS.md).

Com o campo vazio o Dokploy **não** usa o default do Swarm: ele injeta
`{"Parallelism":1,"Order":"start-first","FailureAction":"rollback"}` no Update Config e
`{"Parallelism":1,"Order":"start-first"}` no Rollback Config — código do Dokploy v0.30.2 (tag
`8c2d4d5`), `packages/server/src/utils/docker/utils.ts:678-696`, conferido em 25/09/2026 (registro:
D-020 em [DECISOES.md](DECISOES.md)). Resultado com o campo vazio: todo deploy sobe o container
novo com o antigo vivo (as mesmas contas abertas duas vezes — ver B-004).

Update Config:

```json
{
  "Parallelism": 1,
  "Delay": 10000000000,
  "FailureAction": "rollback",
  "Order": "stop-first"
}
```

Rollback Config:

```json
{
  "Parallelism": 1,
  "Order": "stop-first"
}
```

- Chaves aceitas pelo Dokploy v0.30.2 (`UpdateConfigSwarmSchema`,
  `packages/server/src/db/schema/shared.ts:142-151`, `.strict()`): `Parallelism` e `Order`
  obrigatórias; `Delay`, `FailureAction`, `Monitor` e `MaxFailureRatio` opcionais. Tempo em
  nanossegundos (`Delay` 10000000000 = 10 s). Chave fora dessa lista é rejeitada.
- Depois de salvar, fazer **Deploy** e conferir no servidor:
  `docker service inspect <gateway> --format '{{json .Spec.UpdateConfig}} {{json .Spec.RollbackConfig}}'`
  → os dois com `"Order":"stop-first"`. StopGracePeriod e demais passos: B-004.
- **Custo:** o stop-first perde a rede do start-first (em 16/08 o container antigo segurou a API
  quando o novo caiu com `Cannot find module 'zod'`). Imagem quebrada passa a ser outage → as
  guardas de build da **P-055** vêm antes ou junto do B-004 (entregues em 25/09 na etapa E2 —
  sobem no deploy A). Rollback manual: [how-to/rollback-gateway.md](how-to/rollback-gateway.md).

> Recomendação REVISADA em 14/08/2026 (P-015). **Nota 25/09/2026 (D-020):** o "deixar VAZIO =
> stop-first" desta revisão estava errado para o Dokploy (ver acima); o texto abaixo segue válido
> como motivo para NÃO usar start-first. A versão anterior deste runbook sugeria
> `start-first` (zero-downtime), mas com o volume `gateway-wwebjs` compartilhado isso faz o
> container NOVO subir com o VELHO ainda vivo: o boot novo remove os SingletonLock do Chromium
> AINDA ATIVO (`clearStaleSingletonLocks` assume lock remanescente = processo morto) e DOIS
> Chromium abrem o mesmo perfil → corrupção/conflito → o WhatsApp invalida a sessão (QR).
> O gateway é stateful (1 réplica, sessão WhatsApp): ~30–90s de API fora por deploy é o custo
> certo para a sessão sobreviver. Zero-downtime real nunca existiu para o WhatsApp aqui.

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

## 6. Deploy por imagem do GHCR (A5 — D-052, desde 27/10/2026)

> **Estado:** os workflows existem (passos a–c da adoção); as duas aplicações do Dokploy **seguem
> com build do Git** até o dono fazer o passo d (B-008). Até lá, as seções 2 e 3 descrevem a produção.

**Princípio:** a imagem é montada e testada **uma vez**, no CI (`ci.yml`, job `imagens`), e vai ao
GHCR só com a etiqueta imutável `sha-<12 primeiros do commit>`. O Dokploy não monta nada: puxa sempre
a etiqueta móvel `producao`. Publicar = mover a `producao` para uma `sha-` já testada + **Deploy** no
painel. Voltar = mover de volta + Deploy. Sem rebuild.

| Imagem    | Pacote no GHCR                            |
| --------- | ----------------------------------------- |
| gateway   | `ghcr.io/diogocs32/conexozenvo-gateway`   |
| dashboard | `ghcr.io/diogocs32/conexozenvo-dashboard` |

Pacotes **privados** (padrão do GHCR na primeira publicação). Cada imagem é **um manifesto só**
(`--provenance=false --sbom=false`; o CI confere o `mediaType` após o envio) — índice com atestado
deixaria manifestos sem etiqueta que a limpeza apagaria, quebrando a imagem.

### 6.1 Publicar uma versão

1. PR mergeado na main com CI verde → o resumo do job `imagens` mostra a etiqueta (`sha-…`).
2. GitHub → **Actions → deploy-production → Run workflow**: `app` (gateway ou dashboard),
   `image_tag` = `sha-…`, `confirm` = `promover`. A imagem que estava na `producao` ganha a etiqueta
   `producao-anterior`.
3. Dokploy → aplicação correspondente → **Deploy** (o workflow NÃO chama o Dokploy — D-027).
   Gateway antes do painel quando o contrato mudou.
4. Registro: etiqueta git `vX.Y.Z` no commit publicado, entrada no CHANGELOG e, no ESTADO.md, a
   versão anterior e a nova.

### 6.2 Voltar uma versão

Rodar o deploy-production com a `sha-` boa (na página do pacote ela aparece ao lado da etiqueta
`producao-anterior`) e apertar **Deploy**. Seguro só quando as migrations são compatíveis com a
versão anterior: o entrypoint do gateway segue rodando `prisma migrate deploy` na subida (decisão
D-052), então **toda migration acrescenta primeiro e só remove numa publicação seguinte**
(expand/contract) — uma imagem antiga precisa funcionar sobre o banco novo.

### 6.3 Limpeza das imagens antigas (`limpeza-ghcr.yml`)

Guarda as **11** `sha-*` mais recentes de cada pacote + as que têm `producao` ou `producao-anterior`;
apaga o resto (inclusive as que ficaram sem etiqueta). **Só à mão por enquanto:** Actions →
limpeza-ghcr → Run workflow; sem marcar `apagar`, apenas lista. Apagar de verdade é recusado
enquanto o pacote não tiver a etiqueta `producao`. O agendamento semanal (segunda 06:00 UTC) entra
depois de o dono conferir a lista de uma rodada simulada (P-109).

### 6.4 Passo d — trocar a aplicação para imagem (ação do dono, B-008)

Ordem: a) CI envia a `sha-` (feito no merge) → b) limpeza simulada conferida → c) primeira
promoção pelo workflow → **d)** trocar no Dokploy, uma aplicação por vez:

1. Pré-requisitos no GitHub: variável de repositório `VITE_API_URL` (o mesmo valor do Build Time
   Argument atual do dashboard) **antes do merge** desta onda; token clássico só com `read:packages`
   para o Dokploy; papel **Admin** do repositório em cada pacote (Package settings → Manage Actions
   access) para a limpeza.
2. Conferir no servidor que a arquitetura é `x86_64` (`uname -m`): a imagem do CI é `linux/amd64`.
3. Aplicação → **General → Source: Docker**: imagem `ghcr.io/diogocs32/conexozenvo-<app>:producao`,
   registry `ghcr.io`, usuário `diogocs32` e o token do item 1.
4. **Gateway:** manter Environment, o volume `gateway-wwebjs` → `/data/wwebjs`, 1 réplica, e o
   Update/Rollback Config com **stop-first** (B-004, §2) — o Zero Downtime start-first do Prontuário
   **não serve** aqui (duas instâncias abririam as mesmas contas). Reinício com sessão real
   conectada: uma vez, em janela calma.
5. **Dashboard:** o Build Time Argument `VITE_API_URL` deixa de ter efeito (o valor vem do CI);
   start-first serve.
6. Auto-deploy **desligado** (D-027) e "Clean Cache" desligado. **Deploy** → conferir `/health` e o
   login do painel.

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
  só faz deploy, sem gastar CPU/RAM em build) — adotado na A5: ver §6 (D-052).
