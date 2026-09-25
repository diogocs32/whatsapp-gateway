# syntax=docker/dockerfile:1
# Gateway (NestJS + Fastify) — Node 26, multi-stage.
# Inclui Chromium para a engine WWEBJS (whatsapp-web.js). Se for usar SOMENTE a engine
# Baileys, remova `chromium` e `fonts-liberation` do apt-get (mantenha curl) — imagem bem menor.
#
# Dokploy:  Dockerfile Path = apps/gateway/Dockerfile  |  Context = . (raiz do monorepo)

# ============================ Stage 1: build =================================
FROM node:26-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
# DATABASE_URL dummy: o prisma.config.ts exige a var, mas `prisma generate` NÃO conecta ao banco.
# A URL real entra em runtime (env do Dokploy) e é usada pelo `migrate deploy` no entrypoint.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# openssl: o Prisma CLI precisa detectar a libssl no `generate` (bookworm-slim não inclui o pacote),
# senão cai no fallback "openssl-1.1.x" e emite warning. Ver docs/prisma system-requirements.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Manifests primeiro → camada de cache das dependências
COPY package.json package-lock.json ./
COPY apps/gateway/package.json apps/gateway/
COPY packages/contracts/package.json packages/contracts/
# patches/ ANTES do npm ci: o postinstall da raiz roda patch-package (fix `$1` do whatsapp-web.js,
# B-002) e sem a pasta presente o install passaria SEM aplicar o patch — a lib subiria quebrada
# nas builds novas do WA Web.
COPY patches ./patches
RUN npm ci

# P-055 — guardas de build: com stop-first (B-004) imagem quebrada vira indisponibilidade, então o
# build FALHA ALTO. O postinstall roda `patch-package --error-on-fail` (fora de CI o patch-package
# sai 0 mesmo quando o patch falha — node_modules/patch-package/dist/index.js) e aqui conferimos o
# resultado: patch do whatsapp-web.js aplicado (depois do npm ci, antes do build).
COPY scripts/guardas-build.sh scripts/verificar-deps-runtime.cjs ./scripts/
RUN sh scripts/guardas-build.sh patches

# Código → gera o Prisma client (src/generated/prisma) → build (dist/main.js, conferido pela guarda)
COPY . .
RUN npm run gateway:generate && npm run gateway:build && sh scripts/guardas-build.sh dist

# Item 17 (prune): derruba as devDependencies antes da cópia para o runtime. O que o boot ainda
# precisa (Prisma CLI + dotenv, usados pelo migrate deploy via prisma.config.ts) virou dependency
# no package.json do gateway. Corta @nestjs/cli, @swc/core, typescript, vitest etc. da imagem.
# mkdir: garante o node_modules ANINHADO do workspace mesmo quando o hoisting for total — o COPY
# dele no estágio runtime não pode falhar por pasta ausente.
RUN npm prune --omit=dev && mkdir -p apps/gateway/node_modules

# ============================ Stage 2: runtime ==============================
FROM node:26-bookworm-slim AS production
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

# curl = healthcheck (sempre). chromium/fonts/tini = engine WWEBJS (remova se só Baileys).
# openssl = libssl p/ o `prisma migrate deploy` no entrypoint (schema engine nativo).
# gosu = queda de privilégio no entrypoint (item 17): o container inicia como root SÓ para
# corrigir o dono do volume persistente e desce para o usuário `node` antes de rodar qualquer
# coisa (Node, Prisma e Chromium NÃO rodam como root). Por isso não há diretiva USER aqui.
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates tini chromium fonts-liberation openssl gosu \
    && rm -rf /var/lib/apt/lists/*
ENV WWEBJS_CHROME_PATH=/usr/bin/chromium
ENV WWEBJS_DATA_PATH=/data/wwebjs
RUN mkdir -p /data/wwebjs

WORKDIR /app/apps/gateway
# node_modules já SEM devDependencies (prune no build). Prisma CLI + dotenv são dependencies —
# o entrypoint precisa deles no `migrate deploy` (prisma.config.ts).
COPY --from=build /app/node_modules /app/node_modules
# node_modules ANINHADO do workspace (hoisting parcial do npm): quando uma devDep da RAIZ exige
# outra major de uma dep do gateway (ex.: 16/08 — eslint-plugin-react-hooks puxou zod@4 p/ a raiz
# e o zod@3 do gateway ficou em apps/gateway/node_modules), copiar SÓ a raiz deixava a imagem sem
# a dep (o prune remove a cópia da raiz por ser dev) → MODULE_NOT_FOUND no boot e deploy que não
# troca o container (Swarm segura o antigo). Copiar o aninhado cobre QUALQUER dep nessa situação.
COPY --from=build /app/apps/gateway/node_modules ./node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/apps/gateway/dist ./dist
COPY --from=build /app/apps/gateway/prisma ./prisma
COPY --from=build /app/apps/gateway/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/apps/gateway/package.json ./package.json
COPY apps/gateway/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# P-055 — guardas na imagem FINAL (exatamente o que vai rodar): patch do wwebjs presente, entrypoint
# dist/main.js existe, todo pacote que o dist usa CARREGA com o node_modules copiado (pega no BUILD o
# `Cannot find module 'zod'` de 16/08 — hoisting parcial + prune — que antes só aparecia no boot) e o
# 1º comando do entrypoint (Prisma CLI + prisma.config.ts, fora do dist) funciona. Os scripts somem
# do filesystem final (seguem numa camada de ~20 KB — sem efeito em runtime).
COPY scripts/guardas-build.sh scripts/verificar-deps-runtime.cjs /tmp/guardas/
RUN cd /app && sh /tmp/guardas/guardas-build.sh patches \
    && sh /tmp/guardas/guardas-build.sh dist \
    && sh /tmp/guardas/guardas-build.sh deps apps/gateway/dist \
    && sh /tmp/guardas/guardas-build.sh prisma \
    && rm -rf /tmp/guardas

EXPOSE 3000
# Healthcheck do container. No Dokploy, configure também o Swarm Health Check (ver docs/deploy-dokploy.md).
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/health || exit 1

# tini como init: faz o "reaping" dos processos do Chrome e propaga sinais (shutdown limpo).
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
