#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
echo "=== build imagem ==="
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -1
NET=cz-users
docker network create $NET >/dev/null 2>&1
docker rm -f us-pg us-redis us-gw >/dev/null 2>&1
docker run -d --name us-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name us-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 10
docker run -d --name us-gw --network $NET \
  -e DB_HOST=us-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=us-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=smoke-secret-0123456789 -e DASHBOARD_PASSWORD=smoke123 -e MAX_SEATS=2 \
  cz-gw:test >/dev/null 2>&1
sleep 40
B="docker exec us-gw"
jqid() { grep -oE '"id":"[^"]+"' | head -1 | sed 's/"id":"//;s/"$//'; }
tok() { $B curl -s -m 8 -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"$1\",\"password\":\"$2\"}" 2>/dev/null | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"//;s/"$//'; }
TOKO=$(tok admin smoke123)
echo "OWNER token: ${TOKO:0:12}.."

echo "=== GET /api/users (esperado 1 user, used=1, max=2) ==="
LIST=$($B curl -s -m 8 http://127.0.0.1:3000/api/users -H "Authorization: Bearer $TOKO" 2>/dev/null)
echo "  ${LIST:0:240}"
OWNERID=$(echo "$LIST" | jqid)

echo "=== POST criar op1 (OPERATOR) ==="
OP1=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/users -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d '{"username":"op1","name":"Operador 1","password":"op1senha","role":"OPERATOR"}' 2>/dev/null)
echo "  ${OP1:0:200}"
OP1ID=$(echo "$OP1" | jqid)

echo "=== POST criar op2 (limite=2 atingido) ==="
$B curl -s -m 8 -o /dev/null -w "  HTTP %{http_code}  (esperado 409)\n" -X POST http://127.0.0.1:3000/api/users -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d '{"username":"op2","name":"Op 2","password":"op2senha","role":"OPERATOR"}' 2>/dev/null

echo "=== op1 loga e tenta gerir usuarios (so OWNER) ==="
TOK1=$(tok op1 op1senha)
$B curl -s -m 8 -o /dev/null -w "  op1 GET /api/users: HTTP %{http_code}  (esperado 403)\n" http://127.0.0.1:3000/api/users -H "Authorization: Bearer $TOK1" 2>/dev/null

echo "=== OWNER edita op1 (role->VIEWER) e reseta senha ==="
$B curl -s -m 8 -o /dev/null -w "  PATCH role->VIEWER: HTTP %{http_code}  (esperado 200)\n" -X PATCH http://127.0.0.1:3000/api/users/$OP1ID -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d '{"role":"VIEWER"}' 2>/dev/null
$B curl -s -m 8 -o /dev/null -w "  POST .../password: HTTP %{http_code}  (esperado 201)\n" -X POST http://127.0.0.1:3000/api/users/$OP1ID/password -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d '{"password":"novasenha"}' 2>/dev/null
$B curl -s -m 8 -o /dev/null -w "  login op1 nova senha: HTTP %{http_code}  (esperado 201)\n" -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"op1","password":"novasenha"}' 2>/dev/null

echo "=== protecao do ultimo OWNER ==="
$B curl -s -m 8 -o /dev/null -w "  DELETE proprio OWNER: HTTP %{http_code}  (esperado 403)\n" -X DELETE http://127.0.0.1:3000/api/users/$OWNERID -H "Authorization: Bearer $TOKO" 2>/dev/null
$B curl -s -m 8 -o /dev/null -w "  PATCH OWNER->ADMIN: HTTP %{http_code}  (esperado 403)\n" -X PATCH http://127.0.0.1:3000/api/users/$OWNERID -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d '{"role":"ADMIN"}' 2>/dev/null

echo "=== DELETE op1 ==="
$B curl -s -m 8 -o /dev/null -w "  DELETE op1: HTTP %{http_code}  (esperado 200)\n" -X DELETE http://127.0.0.1:3000/api/users/$OP1ID -H "Authorization: Bearer $TOKO" 2>/dev/null

docker rm -f us-gw us-pg us-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
