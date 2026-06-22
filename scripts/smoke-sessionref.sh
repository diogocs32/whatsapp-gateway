#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
echo "=== build imagem ==="
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -2
NET=cz-sr
docker network create $NET >/dev/null 2>&1
docker rm -f sr-pg sr-redis sr-gw >/dev/null 2>&1
docker run -d --name sr-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name sr-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 10
docker run -d --name sr-gw --network $NET \
  -e DB_HOST=sr-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=sr-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=smoke-secret-0123456789 -e DASHBOARD_PASSWORD=smoke123 \
  cz-gw:test >/dev/null 2>&1
sleep 40
B="docker exec sr-gw"
TOKEN=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"smoke123"}' 2>/dev/null | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"//;s/"$//')
KEY=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/api-keys -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"n8n"}' 2>/dev/null | grep -oE '"key":"[^"]+"' | head -1 | sed 's/"key":"//;s/"$//')
echo "key obtida: ${KEY:0:14}..."
NAME=sess-nome-teste
echo "--- criar sessao por nome ($NAME) ---"
$B curl -s -m 25 -o /dev/null -w "  POST /api/sessions: HTTP %{http_code}\n" -X POST http://127.0.0.1:3000/api/sessions -H "X-Api-Key: $KEY" -H "Content-Type: application/json" -d "{\"name\":\"$NAME\",\"engine\":\"BAILEYS\",\"mode\":\"qr\",\"autostart\":false}" 2>/dev/null
echo "--- GET por NOME ---"
BYNAME=$($B curl -s -m 8 http://127.0.0.1:3000/api/sessions/$NAME -H "X-Api-Key: $KEY" 2>/dev/null)
echo "  body: $(echo "$BYNAME" | head -c 170)"
ID=$(echo "$BYNAME" | grep -oE '"id":"[^"]+"' | head -1 | sed 's/"id":"//;s/"$//')
$B curl -s -m 8 -o /dev/null -w "  GET /api/sessions/$NAME (nome): HTTP %{http_code} (esperado 200)\n" http://127.0.0.1:3000/api/sessions/$NAME -H "X-Api-Key: $KEY" 2>/dev/null
echo "  id resolvido a partir do nome: $ID"
echo "--- GET por ID (o mesmo recurso) ---"
$B curl -s -m 8 -o /dev/null -w "  GET /api/sessions/<id>: HTTP %{http_code} (esperado 200)\n" http://127.0.0.1:3000/api/sessions/$ID -H "X-Api-Key: $KEY" 2>/dev/null
echo "--- GET inexistente ---"
$B curl -s -m 8 -o /dev/null -w "  GET /api/sessions/nao-existe-999: HTTP %{http_code} (esperado 404)\n" http://127.0.0.1:3000/api/sessions/nao-existe-999 -H "X-Api-Key: $KEY" 2>/dev/null
docker rm -f sr-gw sr-pg sr-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
