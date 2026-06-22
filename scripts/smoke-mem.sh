#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
echo "=== build imagem ==="
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -1
NET=cz-mem
docker network create $NET >/dev/null 2>&1
docker rm -f mem-pg mem-redis mem-gw >/dev/null 2>&1
docker run -d --name mem-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name mem-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 10
docker run -d --name mem-gw --network $NET --memory=512m --memory-swap=512m \
  -e DB_HOST=mem-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=mem-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=smoke-secret-0123456789 -e DASHBOARD_PASSWORD=smoke123 \
  cz-gw:test >/dev/null 2>&1
sleep 40
echo "=== auto-tune do heap (log do entrypoint) ==="
docker logs mem-gw 2>&1 | grep -i "cgroup\|max-old-space" | head -3
echo "=== /health (metrica honesta) ==="
docker exec mem-gw curl -s -m 5 http://127.0.0.1:3000/health 2>/dev/null; echo
echo "=== uso REAL do container (docker stats) p/ comparar com memoryUsedPct ==="
docker stats --no-stream --format "  {{.Name}}: mem={{.MemUsage}} perc={{.MemPerc}}" mem-gw 2>/dev/null
docker rm -f mem-gw mem-pg mem-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
