#!/usr/bin/env bash
# Dispara um reload do gateway (touch num .ts) e aguarda o webshare status virar configured:true.
set -uo pipefail
H=http://localhost:3000

touch apps/gateway/src/main.ts
echo "reload disparado (touch em main.ts); aguardando recompilar..."

for i in $(seq 1 40); do
  sleep 1
  TOKEN=$(curl -s -X POST "$H/api/auth/login" -H 'content-type: application/json' \
    -d '{"username":"admin","password":"admin123"}' \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])' 2>/dev/null || true)
  [ -z "${TOKEN:-}" ] && { echo "t=${i}s: gateway reiniciando..."; continue; }
  CFG=$(curl -s "$H/api/proxies/webshare/status" -H "authorization: Bearer $TOKEN" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("configured"))' 2>/dev/null || true)
  UP=$(curl -s "$H/health" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("uptimeSeconds"))' 2>/dev/null || true)
  echo "t=${i}s: uptime=${UP}s configured=${CFG}"
  if [ "$CFG" = "True" ]; then echo ">>> WEBSHARE configurado e carregado."; exit 0; fi
done
echo ">>> Ainda não carregou (touch pode não ter disparado recompilação)."
