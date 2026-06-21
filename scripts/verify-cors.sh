#!/usr/bin/env bash
# Verifica o preflight CORS para PUT no endpoint de assignment + um PUT real (idempotente: mode NONE).
set -uo pipefail
H=http://localhost:3000
ORIGIN=http://localhost:5173

TOKEN=$(curl -s -X POST "$H/api/auth/login" \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])' 2>/dev/null)
if [ -z "${TOKEN:-}" ]; then echo "(login falhou — gateway recompilando? tente de novo)"; exit 0; fi

SID=$(curl -s "$H/api/sessions" -H "authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")' 2>/dev/null)
if [ -z "$SID" ]; then echo "(sem sessões)"; exit 0; fi

echo "== Preflight OPTIONS (PUT) =="
curl -s -i -X OPTIONS "$H/api/sessions/$SID/proxy" \
  -H "Origin: $ORIGIN" \
  -H 'Access-Control-Request-Method: PUT' \
  -H 'Access-Control-Request-Headers: content-type,authorization' \
  | grep -iE '^HTTP/|access-control-allow-(origin|methods|headers)'

echo; echo "== PUT real (mode NONE, idempotente) =="
curl -s -X PUT "$H/api/sessions/$SID/proxy" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"mode":"NONE"}'
echo
