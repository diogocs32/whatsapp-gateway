# syntax=docker/dockerfile:1
# Dashboard (React 19 + Vite 8) — build estático servido por Nginx.
# IMPORTANTE: VITE_API_URL é BUILD-TIME (embutida no bundle). No Dokploy, passe-a como
# "Build Time Argument". Mudar em runtime NÃO tem efeito.
#
# Dokploy:  Dockerfile Path = apps/dashboard/Dockerfile  |  Context = . (raiz do monorepo)

# ============================ Stage 1: build =================================
FROM node:26-bookworm-slim AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# npm ci instala todos os workspaces (inclui o puppeteer do gateway) — pular o download do Chromium.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/contracts/package.json packages/contracts/
# patches/ antes do npm ci — o postinstall da raiz roda patch-package (ver Dockerfile do gateway).
COPY patches ./patches
RUN npm ci

COPY . .
RUN npm run dashboard:build

# ============================ Stage 2: Nginx ================================
FROM nginx:1.27-alpine AS production
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 80
# 127.0.0.1 (não "localhost"): no container localhost resolve p/ ::1 (IPv6) e o wget do BusyBox
# não faz fallback p/ IPv4 — daria unhealthy mesmo com o nginx no ar.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
