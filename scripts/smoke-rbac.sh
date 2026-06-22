#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
. "$HOME/.nvm/nvm.sh" >/dev/null 2>&1; nvm use 26 >/dev/null 2>&1
SECRET=smoke-secret-0123456789
echo "=== build imagem ==="
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -1
NET=cz-rbac
docker network create $NET >/dev/null 2>&1
docker rm -f rb-pg rb-redis rb-gw >/dev/null 2>&1
docker run -d --name rb-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name rb-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 10
docker run -d --name rb-gw --network $NET \
  -e DB_HOST=rb-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=rb-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=$SECRET -e DASHBOARD_PASSWORD=smoke123 \
  cz-gw:test >/dev/null 2>&1
sleep 40
B="docker exec rb-gw"

# forja JWT HS256 com o MESMO segredo do gateway, para cada papel
mktok() { node -e '
const c=require("crypto");
const b=(x)=>Buffer.from(x).toString("base64url");
const h=b(JSON.stringify({alg:"HS256",typ:"JWT"}));
const p=b(JSON.stringify({sub:"t",username:"t",role:process.argv[1]}));
const d=h+"."+p;
const s=c.createHmac("sha256",process.argv[2]).update(d).digest("base64url");
console.log(d+"."+s);' "$1" "$SECRET"; }
TV=$(mktok VIEWER); TO=$(mktok OPERATOR); TA=$(mktok ADMIN); TW=$(mktok OWNER)
echo "tokens forjados: VIEWER=${TV:0:12}.. OPERATOR=${TO:0:12}.. ADMIN=${TA:0:12}.. OWNER=${TW:0:12}.."

# API key real (login OWNER -> cria key)
JWT=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"smoke123"}' 2>/dev/null | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"//;s/"$//')
KEY=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/api-keys -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"name":"k"}' 2>/dev/null | grep -oE '"key":"[^"]+"' | head -1 | sed 's/"key":"//;s/"$//')

code() { local desc="$1"; shift; local c=$($B curl -s -m 8 -o /dev/null -w "%{http_code}" "$@" 2>/dev/null); printf "  %-26s HTTP %s\n" "$desc" "$c"; }

echo "=== GET /api/sessions  (leitura -> VIEWER+; sem token 401) ==="
code "VIEWER (200)"        http://127.0.0.1:3000/api/sessions -H "Authorization: Bearer $TV"
code "OPERATOR (200)"      http://127.0.0.1:3000/api/sessions -H "Authorization: Bearer $TO"
code "ADMIN (200)"         http://127.0.0.1:3000/api/sessions -H "Authorization: Bearer $TA"
code "X-Api-Key=ADMIN (200)" http://127.0.0.1:3000/api/sessions -H "X-Api-Key: $KEY"
code "sem token (401)"     http://127.0.0.1:3000/api/sessions

echo "=== GET /api/webhooks  (infra -> ADMIN+) ==="
code "VIEWER (403)"        http://127.0.0.1:3000/api/webhooks -H "Authorization: Bearer $TV"
code "OPERATOR (403)"      http://127.0.0.1:3000/api/webhooks -H "Authorization: Bearer $TO"
code "ADMIN (200)"         http://127.0.0.1:3000/api/webhooks -H "Authorization: Bearer $TA"
code "OWNER (200)"         http://127.0.0.1:3000/api/webhooks -H "Authorization: Bearer $TW"
code "X-Api-Key (200)"     http://127.0.0.1:3000/api/webhooks -H "X-Api-Key: $KEY"

echo "=== POST /api/sessions {}  (criar -> ADMIN; quem passa o RBAC cai em 400 body) ==="
code "VIEWER (403)"        -X POST http://127.0.0.1:3000/api/sessions -H "Authorization: Bearer $TV" -H "Content-Type: application/json" -d "{}"
code "OPERATOR (403)"      -X POST http://127.0.0.1:3000/api/sessions -H "Authorization: Bearer $TO" -H "Content-Type: application/json" -d "{}"
code "ADMIN (400)"         -X POST http://127.0.0.1:3000/api/sessions -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d "{}"
code "X-Api-Key (400)"     -X POST http://127.0.0.1:3000/api/sessions -H "X-Api-Key: $KEY" -H "Content-Type: application/json" -d "{}"

docker rm -f rb-gw rb-pg rb-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
