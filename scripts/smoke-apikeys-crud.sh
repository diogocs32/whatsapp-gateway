#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
echo "=== build imagem ==="
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -1
NET=cz-kc
docker network create $NET >/dev/null 2>&1
docker rm -f kc-pg kc-redis kc-gw >/dev/null 2>&1
docker run -d --name kc-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name kc-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 10
docker run -d --name kc-gw --network $NET \
  -e DB_HOST=kc-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=kc-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=smoke-secret-0123456789 -e DASHBOARD_PASSWORD=smoke123 \
  cz-gw:test >/dev/null 2>&1
sleep 40
B="docker exec kc-gw"
TOKEN=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"smoke123"}' 2>/dev/null | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"//;s/"$//')
echo "token: ${TOKEN:0:14}..."
echo "--- criar 2 keys (k1, k2) ---"
ID1=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/api-keys -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"k1"}' 2>/dev/null | grep -oE '"id":"[^"]+"' | head -1 | sed 's/"id":"//;s/"$//')
$B curl -s -m 8 -X POST http://127.0.0.1:3000/api/api-keys -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"k2"}' >/dev/null 2>&1
echo "  id1=$ID1"
echo "--- GET /api/api-keys (list, JWT) ---"
LIST=$($B curl -s -m 8 http://127.0.0.1:3000/api/api-keys -H "Authorization: Bearer $TOKEN" 2>/dev/null)
echo "  qtd keys na lista: $(echo "$LIST" | grep -oE '\"id\":' | wc -l)  (esperado 2)"
echo "  expoe a key em texto na lista? [$(echo "$LIST" | grep -oE '\"key\":' | head -1)]  (esperado vazio)"
echo "  tem prefix? [$(echo "$LIST" | grep -oE '\"prefix\":\"[^\"]+\"' | head -1)]"
echo "--- DELETE (revoke id1) ---"
$B curl -s -m 8 -o /dev/null -w "  DELETE /api/api-keys/<id1>: HTTP %{http_code}  (esperado 200)\n" -X DELETE http://127.0.0.1:3000/api/api-keys/$ID1 -H "Authorization: Bearer $TOKEN" 2>/dev/null
LIST2=$($B curl -s -m 8 http://127.0.0.1:3000/api/api-keys -H "Authorization: Bearer $TOKEN" 2>/dev/null)
echo "  apos revoke, revokedAt preenchido? [$(echo "$LIST2" | grep -oE '\"revokedAt\":\"[^\"]+\"' | head -1)]  (esperado 1 com data)"
echo "--- list SEM JWT ---"
$B curl -s -m 8 -o /dev/null -w "  GET /api/api-keys sem auth: HTTP %{http_code}  (esperado 401)\n" http://127.0.0.1:3000/api/api-keys 2>/dev/null
docker rm -f kc-gw kc-pg kc-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
