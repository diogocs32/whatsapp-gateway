#!/usr/bin/env bash
# Demonstra o egress trocando: atribui RANGE POS-POS à 1a sessão, reconecta e mostra antes/depois.
# Uso: bash scripts/proxy-demo.sh [POS]   (POS = posição do proxy, default 5)
set -uo pipefail
H=http://localhost:3000
POS=${1:-5}

TOKEN=$(curl -s -X POST "$H/api/auth/login" -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
SID=$(curl -s "$H/api/sessions" -H "authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")')
echo "Sessão: $SID | proxy alvo: posição #$POS"

echo; echo "=== EGRESS ANTES (conexões externas do node) ==="
ss -tnp 2>/dev/null | grep -i node | grep -vE '127.0.0.1|\[::1\]' || echo "(nenhuma externa)"

echo; echo "=== Atribuindo RANGE $POS-$POS (STICKY) ==="
curl -s -X PUT "$H/api/sessions/$SID/proxy" -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d "{\"mode\":\"RANGE\",\"rangeStart\":$POS,\"rangeEnd\":$POS,\"strategy\":\"STICKY\"}"
echo

echo; echo "=== Reconectando a sessão (restart) — aplica o proxy ==="
curl -s -X POST "$H/api/sessions/$SID/restart" -H "authorization: Bearer $TOKEN" >/dev/null
for i in $(seq 1 25); do
  sleep 2
  ST=$(curl -s "$H/api/sessions/$SID" -H "authorization: Bearer $TOKEN" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])' 2>/dev/null || true)
  echo "  t=$((i*2))s status=$ST"
  [ "$ST" = "WORKING" ] && break
  [ "$ST" = "SCAN_QR_CODE" ] && { echo "  (pediu QR — credenciais perdidas)"; break; }
  [ "$ST" = "FAILED" ] && break
done

echo; echo "=== Proxy atual no assignment (resolvido na conexão) ==="
curl -s "$H/api/sessions/$SID/proxy" -H "authorization: Bearer $TOKEN"; echo

echo; echo "=== EGRESS DEPOIS (conexões externas do node) ==="
ss -tnp 2>/dev/null | grep -i node | grep -vE '127.0.0.1|\[::1\]' || echo "(nenhuma externa)"

echo; echo "Esperado: linha p/ o IP do proxy #$POS (ex.: 190.106.183.206:5251) e NÃO p/ 57.144.x.x (Meta)."
