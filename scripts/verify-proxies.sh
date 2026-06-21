#!/usr/bin/env bash
# Verificação read-only do F3 contra o gateway em execução (não reinicia nada).
set -uo pipefail
H=http://localhost:3000

echo "== /health =="
curl -s "$H/health"; echo

TOKEN=$(curl -s -X POST "$H/api/auth/login" \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])' 2>/dev/null)

if [ -z "${TOKEN:-}" ]; then echo "(falha no login — gateway pode estar recompilando)"; exit 0; fi

AUTH="authorization: Bearer $TOKEN"

echo "== /api/proxies =="
curl -s "$H/api/proxies" -H "$AUTH"; echo

echo "== /api/proxies/webshare/status =="
curl -s "$H/api/proxies/webshare/status" -H "$AUTH"; echo

echo "== /api/sessions (id/name/status) =="
curl -s "$H/api/sessions" -H "$AUTH" \
  | python3 -c 'import sys,json;[print(s["id"],"|",s["name"],"|",s["status"],"|",s.get("phoneNumber")) for s in json.load(sys.stdin)]' 2>/dev/null

SID=$(curl -s "$H/api/sessions" -H "$AUTH" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")' 2>/dev/null)

if [ -n "$SID" ]; then
  echo "== /api/sessions/$SID/proxy (assignment default) =="
  curl -s "$H/api/sessions/$SID/proxy" -H "$AUTH"; echo
fi
