#!/usr/bin/env bash
# Testa todos os proxies (latência + IP de saída) e lista os ALIVE com posição.
set -uo pipefail
H=http://localhost:3000
TOKEN=$(curl -s -X POST "$H/api/auth/login" -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

echo "Testando o pool (até ~30s)..."
curl -s --max-time 150 -X POST "$H/api/proxies/test-all" -H "authorization: Bearer $TOKEN" > /dev/null
curl -s "$H/api/proxies" -H "authorization: Bearer $TOKEN" > /tmp/pool.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/pool.json'))
alive = [p for p in d if p["status"] == "ALIVE"]
dead = [p for p in d if p["status"] == "DEAD"]
print(f"total: {len(d)} | ALIVE: {len(alive)} | DEAD: {len(dead)}")
print("--- ALIVE (posição | endereço | latência | IP de saída) ---")
for p in alive[:15]:
    print(f'  #{p["position"]:>3} {p["host"]}:{p["port"]:<5} | {p["latencyMs"]}ms | exit={p["exitIp"]}')
PY
