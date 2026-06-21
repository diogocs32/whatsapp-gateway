#!/usr/bin/env bash
# Verificação read-only do F4: gateway no ar, rotas de mídia mapeadas, MinIO no ar.
set -uo pipefail
H=http://localhost:3000

echo "== /health =="; curl -s "$H/health"; echo
echo "== MinIO (health/live) =="; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9000/minio/health/live

TOKEN=$(curl -s -X POST "$H/api/auth/login" -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])' 2>/dev/null)
[ -z "${TOKEN:-}" ] && { echo "(login falhou — gateway recompilando?)"; exit 0; }

SID=$(curl -s "$H/api/sessions" -H "authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "none")' 2>/dev/null)

echo "== POST media-url sem url (espera 400 = rota mapeada + validação) =="
curl -s -o /dev/null -w "  HTTP %{http_code}\n" -X POST \
  "$H/api/sessions/$SID/messages/media-url" -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"to":"5511999999999"}'

echo "== GET messages (campos de mídia no DTO) =="
curl -s "$H/api/sessions/$SID/messages?chatId=5511999999999&limit=1" \
  -H "authorization: Bearer $TOKEN" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("  ok, exemplo de chaves:", list(d[0].keys()) if d else "(sem mensagens nessa conversa)")' 2>/dev/null || echo "  (sem dados)"
