#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
. "$HOME/.nvm/nvm.sh" >/dev/null 2>&1; nvm use 26 >/dev/null 2>&1
SECRET=smoke-secret-0123456789
echo "=== build imagem ==="
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -1
NET=cz-brand
docker network create $NET >/dev/null 2>&1
docker rm -f br-pg br-redis br-gw >/dev/null 2>&1
docker run -d --name br-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name br-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 10
docker run -d --name br-gw --network $NET \
  -e DB_HOST=br-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=br-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=$SECRET -e DASHBOARD_PASSWORD=smoke123 \
  cz-gw:test >/dev/null 2>&1
sleep 40
B="docker exec br-gw"
TV=$(node -e 'const c=require("crypto");const b=(x)=>Buffer.from(x).toString("base64url");const h=b(JSON.stringify({alg:"HS256",typ:"JWT"}));const p=b(JSON.stringify({sub:"t",username:"t",role:"VIEWER"}));const d=h+"."+p;console.log(d+"."+c.createHmac("sha256",process.argv[1]).update(d).digest("base64url"));' "$SECRET")
TOKO=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"smoke123"}' 2>/dev/null | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"//;s/"$//')
code() { local d="$1"; shift; printf "  %-26s HTTP %s\n" "$d" "$($B curl -s -m 8 -o /dev/null -w "%{http_code}" "$@" 2>/dev/null)"; }

echo "=== A) GET /api/branding PUBLICO (sem token) -> defaults ==="
echo "  $($B curl -s -m 8 http://127.0.0.1:3000/api/branding 2>/dev/null)"
echo "=== B) PUT (OWNER) atualiza marca ==="
echo "  PUT -> $($B curl -s -m 8 -X PUT http://127.0.0.1:3000/api/branding -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d '{"productName":"Conexo Envo","primaryColor":"#2563eb","logoUrl":"https://ex.com/logo.png"}' 2>/dev/null)"
echo "  GET (apos) -> $($B curl -s -m 8 http://127.0.0.1:3000/api/branding 2>/dev/null)"
echo "=== C) validacoes/RBAC ==="
code "PUT cor invalida (400)" -X PUT http://127.0.0.1:3000/api/branding -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d '{"productName":"X","primaryColor":"azul"}'
code "PUT VIEWER (403)" -X PUT http://127.0.0.1:3000/api/branding -H "Authorization: Bearer $TV" -H "Content-Type: application/json" -d '{"productName":"X","primaryColor":"#000000"}'
code "PUT sem token (401)" -X PUT http://127.0.0.1:3000/api/branding -H "Content-Type: application/json" -d '{"productName":"X","primaryColor":"#000000"}'
code "GET publico (200)" http://127.0.0.1:3000/api/branding
docker rm -f br-gw br-pg br-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
