#!/usr/bin/env bash
set +e
cd /home/diogocs32/projetos/whatzapp_api || exit 1
. "$HOME/.nvm/nvm.sh" >/dev/null 2>&1; nvm use 26 >/dev/null 2>&1
SECRET=smoke-secret-0123456789
echo "=== build imagem ==="
docker build -f apps/gateway/Dockerfile -t cz-gw:test . 2>&1 | tail -1
NET=cz-audit
docker network create $NET >/dev/null 2>&1
docker rm -f au-pg au-redis au-gw >/dev/null 2>&1
docker run -d --name au-pg --network $NET -e POSTGRES_USER=gw -e POSTGRES_PASSWORD=gw -e POSTGRES_DB=gw postgres:18-alpine >/dev/null 2>&1
docker run -d --name au-redis --network $NET redis:7-alpine >/dev/null 2>&1
sleep 10
docker run -d --name au-gw --network $NET \
  -e DB_HOST=au-pg -e DB_PORT=5432 -e DB_USER=gw -e DB_PASSWORD=gw -e DB_NAME=gw \
  -e REDIS_HOST=au-redis -e REDIS_PORT=6379 \
  -e JWT_SECRET=$SECRET -e DASHBOARD_PASSWORD=smoke123 \
  cz-gw:test >/dev/null 2>&1
sleep 40
B="docker exec au-gw"
TV=$(node -e 'const c=require("crypto");const b=(x)=>Buffer.from(x).toString("base64url");const h=b(JSON.stringify({alg:"HS256",typ:"JWT"}));const p=b(JSON.stringify({sub:"t",username:"t",role:"VIEWER"}));const d=h+"."+p;console.log(d+"."+c.createHmac("sha256",process.argv[1]).update(d).digest("base64url"));' "$SECRET")
# acoes que geram audit
TOKO=$($B curl -s -m 8 -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"smoke123"}' 2>/dev/null | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"//;s/"$//')
$B curl -s -m 8 -X POST http://127.0.0.1:3000/api/api-keys -H "Authorization: Bearer $TOKO" -H "Content-Type: application/json" -d '{"name":"k1"}' >/dev/null 2>&1
$B curl -s -m 8 http://127.0.0.1:3000/api/sessions -H "Authorization: Bearer $TOKO" >/dev/null 2>&1  # GET: NAO auditar
sleep 2
echo "=== GET /api/audit (OWNER) ==="
LIST=$($B curl -s -m 8 http://127.0.0.1:3000/api/audit -H "Authorization: Bearer $TOKO" 2>/dev/null)
echo "  registros: $(echo "$LIST" | grep -oc '"id":')  (esperado >=2: login + criar key)"
echo "  tem login:admin? [$(echo "$LIST" | grep -oE 'login:admin' | head -1)]"
echo "  tem POST /api/api-keys? [$(echo "$LIST" | grep -oE '"method":"POST","path":"/api/api-keys"' | head -1)]"
echo "  GET /api/sessions auditado? ocorrencias de /api/sessions = $(echo "$LIST" | grep -oc '/api/sessions')  (esperado 0)"
echo "=== RBAC ==="
printf "  VIEWER -> HTTP %s (esperado 403)\n" "$($B curl -s -m 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/audit -H "Authorization: Bearer $TV" 2>/dev/null)"
printf "  sem token -> HTTP %s (esperado 401)\n" "$($B curl -s -m 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/audit 2>/dev/null)"
docker rm -f au-gw au-pg au-redis >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
docker rmi cz-gw:test >/dev/null 2>&1
echo fim
