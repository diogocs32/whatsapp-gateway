#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
echo "=== build imagem ==="
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -2
NET=cz-ak
docker network create $NET >/dev/null 2>&1
docker rm -f ak-pg ak-redis ak-gw >/dev/null 2>&1
docker run -d --name ak-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name ak-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 10
docker run -d --name ak-gw --network $NET \
  -e DB_HOST=ak-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=ak-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=smoke-secret-0123456789 -e DASHBOARD_PASSWORD=smoke123 \
  cz-gw:test >/dev/null 2>&1
sleep 40
B="docker exec ak-gw"
echo -n "/health: "; $B curl -s -m 5 http://127.0.0.1:3000/health 2>/dev/null | head -c 90; echo
TOKEN=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"smoke123"}' 2>/dev/null | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"//;s/"$//')
echo "login token: ${TOKEN:0:18}..."
CREATE=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/api-keys -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"n8n"}' 2>/dev/null)
echo "criar key -> $(echo "$CREATE" | head -c 160)"
KEY=$(echo "$CREATE" | grep -oE '"key":"[^"]+"' | head -1 | sed 's/"key":"//;s/"$//')
echo "--- usar key em GET /api/sessions ---"
$B curl -s -m 8 -o /dev/null -w "  com X-Api-Key:  HTTP %{http_code} (esperado 200)\n" http://127.0.0.1:3000/api/sessions -H "X-Api-Key: $KEY" 2>/dev/null
$B curl -s -m 8 -o /dev/null -w "  sem auth:       HTTP %{http_code} (esperado 401)\n" http://127.0.0.1:3000/api/sessions 2>/dev/null
$B curl -s -m 8 -o /dev/null -w "  key invalida:   HTTP %{http_code} (esperado 401)\n" http://127.0.0.1:3000/api/sessions -H "X-Api-Key: cz_falsa" 2>/dev/null
docker rm -f ak-gw ak-pg ak-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
