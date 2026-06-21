#!/bin/sh
# Entrypoint do gateway em produção: aplica as migrations e sobe o app.
# Roda a partir de WORKDIR /app/apps/gateway (onde estão prisma.config.ts e dist/).
set -e

echo "[entrypoint] prisma migrate deploy..."
# Lê prisma.config.ts → schema + DATABASE_URL (env). migrate deploy NÃO usa shadow DB nem gera SQL.
/app/node_modules/.bin/prisma migrate deploy

echo "[entrypoint] iniciando o gateway (node dist/main.js)..."
exec node dist/main.js
