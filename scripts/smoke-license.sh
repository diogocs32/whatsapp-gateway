#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
. "$HOME/.nvm/nvm.sh" >/dev/null 2>&1; nvm use 26 >/dev/null 2>&1
echo "=== emitir licencas (host, com a chave privada) ==="
LIC_VALID=$(node scripts/issue-license.mjs --customer "ACME" --seats 3 --sessions 2 --days 365 2>/dev/null)
LIC_EXP=$(node scripts/issue-license.mjs --customer "Old" --seats 9 --sessions 9 --days -1 2>/dev/null)
echo "valida: ${LIC_VALID:0:22}.. | expirada: ${LIC_EXP:0:22}.."
echo "=== build imagem ==="
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -1
NET=cz-lic
docker network create $NET >/dev/null 2>&1
docker rm -f lic-pg lic-redis lic-gw >/dev/null 2>&1
docker run -d --name lic-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name lic-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 10
docker run -d --name lic-gw --network $NET \
  -e DB_HOST=lic-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=lic-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=smoke-secret-0123456789 -e DASHBOARD_PASSWORD=smoke123 \
  -e MAX_SEATS=2 -e MAX_SESSIONS=1 \
  cz-gw:test >/dev/null 2>&1
sleep 40
B="docker exec lic-gw"
TOKO=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"smoke123"}' 2>/dev/null | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"//;s/"$//')
g() { $B curl -s -m 8 "$@" -H "Authorization: Bearer $TOKO" 2>/dev/null; }
post() { $B curl -s -m 8 -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3000/api/license -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d "$1" 2>/dev/null; }
mksess() { $B curl -s -m 20 -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3000/api/sessions -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d "{\"name\":\"$1\",\"engine\":\"BAILEYS\",\"mode\":\"qr\",\"autostart\":false}" 2>/dev/null; }

echo "=== A) comunidade (sem licenca) ==="
echo "  $(g http://127.0.0.1:3000/api/license | head -c 220)"
echo "  /api/users -> $(g http://127.0.0.1:3000/api/users | grep -oE '\"maxSeats\":[0-9]+')  (esperado 2 = MAX_SEATS)"

echo "=== B) instalar licenca VALIDA (ACME seats=3 sessions=2) ==="
echo "  POST HTTP $(post "{\"token\":\"$LIC_VALID\"}")  (esperado 201)"
echo "  $(g http://127.0.0.1:3000/api/license | head -c 220)"
echo "  /api/users -> $(g http://127.0.0.1:3000/api/users | grep -oE '\"maxSeats\":[0-9]+')  (esperado 3 = licenca)"

echo "=== C) licenca EXPIRADA e LIXO ==="
echo "  POST expirada -> HTTP $(post "{\"token\":\"$LIC_EXP\"}")  (esperado 400)"
echo "  POST lixo     -> HTTP $(post "{\"token\":\"CZL1.lixo.lixo\"}")  (esperado 400)"
echo "  (licenca ACME ainda ativa?) -> $(g http://127.0.0.1:3000/api/license | grep -oE '\"customer\":\"[^\"]+\"')"

echo "=== D) remover licenca -> volta comunidade ==="
echo "  DELETE HTTP $($B curl -s -m 8 -o /dev/null -w '%{http_code}' -X DELETE http://127.0.0.1:3000/api/license -H "Authorization: Bearer $TOKO" 2>/dev/null)"
echo "  $(g http://127.0.0.1:3000/api/license | grep -oE '\"community\":(true|false)')"

echo "=== E) maxSessions comunidade (=1): criar 1 ok, 2a 409 ==="
echo "  criar sessao s1 -> HTTP $(mksess s1)  (esperado 201)"
echo "  criar sessao s2 -> HTTP $(mksess s2)  (esperado 409 limite)"

echo "=== F) /api/license sem token -> 401 ==="
echo "  HTTP $($B curl -s -m 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/license 2>/dev/null)"

docker rm -f lic-gw lic-pg lic-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
