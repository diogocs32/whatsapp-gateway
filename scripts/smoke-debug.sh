#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -1
NET=cz-dbg
docker network create $NET >/dev/null 2>&1
docker rm -f dbg-pg dbg-redis dbg-gw >/dev/null 2>&1
docker run -d --name dbg-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name dbg-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 12
docker run -d --name dbg-gw --network $NET \
  -e DB_HOST=dbg-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=dbg-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=smoke-secret-0123456789 -e DASHBOARD_PASSWORD=smoke123 \
  cz-gw:test >/dev/null 2>&1
sleep 35
echo "=== LOGS BOOT (tail 45) ==="
docker logs dbg-gw 2>&1 | tail -45
echo "=== /health ==="
docker exec dbg-gw curl -s -m 5 http://127.0.0.1:3000/health 2>/dev/null | head -c 200; echo
docker rm -f dbg-gw dbg-pg dbg-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
