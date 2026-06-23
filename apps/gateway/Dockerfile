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
RUN npm ci

# Código → gera o Prisma client (src/generated/prisma) → build (dist/main.js)
COPY . .
RUN npm run gateway:generate && npm run gateway:build

# ============================ Stage 2: runtime ==============================
FROM node:26-bookworm-slim AS production
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

# curl = healthcheck (sempre). chromium/fonts/tini = engine WWEBJS (remova se só Baileys).
# openssl = libssl p/ o `prisma migrate deploy` no entrypoint (schema engine nativo).
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates tini chromium fonts-liberation openssl \
    && rm -rf /var/lib/apt/lists/*
ENV WWEBJS_CHROME_PATH=/usr/bin/chromium
ENV WWEBJS_DATA_PATH=/data/wwebjs
RUN mkdir -p /data/wwebjs

WORKDIR /app/apps/gateway
# node_modules completo (inclui o Prisma CLI + typescript para ler o prisma.config.ts no deploy)
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/apps/gateway/dist ./dist
COPY --from=build /app/apps/gateway/prisma ./prisma
COPY --from=build /app/apps/gateway/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/apps/gateway/package.json ./package.json
COPY apps/gateway/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
# Healthcheck do container. No Dokploy, configure também o Swarm Health Check (ver docs/deploy-dokploy.md).
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/health || exit 1

# tini como init: faz o "reaping" dos processos do Chrome e propaga sinais (shutdown limpo).
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
