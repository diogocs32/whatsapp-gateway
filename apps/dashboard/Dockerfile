# syntax=docker/dockerfile:1
# Dashboard (React 19 + Vite 8) — build estático servido por Nginx.
# E16: Node e nginx por digest multiarch; smoke HTTP obrigatório ao atualizar os pins.
# IMPORTANTE: VITE_API_URL é BUILD-TIME (embutida no bundle). No Dokploy, passe-a como
# "Build Time Argument". Mudar em runtime NÃO tem efeito.
#
# Dokploy:  Dockerfile Path = apps/dashboard/Dockerfile  |  Context = . (raiz do monorepo)

# ============================ Stage 1: build =================================
FROM node:26.10.0-bookworm-slim@sha256:662933cf47f013bc8e4beb31a6116448427a82057ba7c42c97e4c5ba766504c2 AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# Defensivo: se algum dia o gateway entrar neste build, não baixar o Chrome do puppeteer.
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Só os manifests da raiz, do dashboard e dos contracts entram: o `npm ci` NÃO instala o gateway
# (nem whatsapp-web.js/Baileys). Por isso patches/ fica DE FORA (P-055): o postinstall da raiz
# roda `patch-package --error-on-fail`, e patches de pacotes ausentes fariam o build falhar.
# Sem a pasta: "No patch files found" e segue; o dashboard não executa nenhuma das engines.
COPY package.json package-lock.json ./
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci --strict-allow-scripts

COPY . .
RUN npm run dashboard:build

# ============================ Stage 2: Nginx ================================
FROM nginx:1.30.5-alpine@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94 AS production
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 80
# 127.0.0.1 (não "localhost"): no container localhost resolve p/ ::1 (IPv6) e o wget do BusyBox
# não faz fallback p/ IPv4 — daria unhealthy mesmo com o nginx no ar.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
