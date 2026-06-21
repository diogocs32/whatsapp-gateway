#!/usr/bin/env bash
# Dispara o sync com a Webshare e imprime o resultado + resumo do pool (sem segredos).
set -uo pipefail
H=http://localhost:3000

TOKEN=$(curl -s -X POST "$H/api/auth/login" -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])' 2>/dev/null)
if [ -z "${TOKEN:-}" ]; then echo "(login falhou)"; exit 1; fi

echo "=== POST /api/proxies/webshare/sync ==="
curl -s -X POST "$H/api/proxies/webshare/sync" -H "authorization: Bearer $TOKEN"
echo; echo

echo "=== Pool (total + amostra dos 10 primeiros) ==="
curl -s "$H/api/proxies" -H "authorization: Bearer $TOKEN" | python3 -c '
import sys,json
d=json.load(sys.stdin)
print(f"total no pool: {len(d)}")
for p in d[:10]:
    print(f"  #{p[\"position\"]:>3} {p[\"host\"]}:{p[\"port\"]} {p[\"protocol\"]} | {p[\"source\"]} | {p.get(\"country\")} | {p[\"status\"]}")
' 2>/dev/null
