#!/bin/sh
# Entrypoint do gateway em produção: aplica as migrations e sobe o app.
# Roda a partir de WORKDIR /app/apps/gateway (onde estão prisma.config.ts e dist/).
set -e

# Auto-tune do heap do V8 conforme o limite de memória do container (cgroup v2).
# O Node NÃO ajusta --max-old-space-size pelo cgroup automaticamente; sem isso, o heap pode crescer
# até o container ser morto por OOM. Damos ~50% do limite ao heap do Node (mínimo 256 MB), deixando
# o restante para os processos Chromium do whatsapp-web.js e o rss base. Respeita override manual.
if ! echo "${NODE_OPTIONS:-}" | grep -q 'max-old-space-size'; then
  CG=/sys/fs/cgroup/memory.max
  if [ -r "$CG" ]; then
    MAXB=$(cat "$CG" 2>/dev/null || echo max)
    if [ "$MAXB" != "max" ] && [ "$MAXB" -gt 0 ] 2>/dev/null; then
      HEAP_MB=$(( MAXB / 1024 / 1024 / 2 ))
      [ "$HEAP_MB" -lt 256 ] && HEAP_MB=256
      export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=${HEAP_MB}"
      echo "[entrypoint] cgroup limit=$(( MAXB / 1024 / 1024 ))MB -> NODE_OPTIONS=${NODE_OPTIONS}"
    fi
  fi
fi

echo "[entrypoint] prisma migrate deploy..."
# Lê prisma.config.ts → schema + DATABASE_URL (env). migrate deploy NÃO usa shadow DB nem gera SQL.
/app/node_modules/.bin/prisma migrate deploy

echo "[entrypoint] iniciando o gateway (node dist/main.js)..."
exec node dist/main.js
