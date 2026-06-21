#!/usr/bin/env bash
# Lista o pool de proxies (sem segredos). Usa heredoc Python p/ evitar problemas de aspas.
set -uo pipefail
H=http://localhost:3000
TOKEN=$(curl -s -X POST "$H/api/auth/login" -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s "$H/api/proxies" -H "authorization: Bearer $TOKEN" > /tmp/pool.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/pool.json'))
print("total no pool:", len(d))
print("posições:", f'{d[0]["position"]}..{d[-1]["position"]}' if d else "—")
for p in d[:12]:
    print(f'  #{p["position"]:>3} {p["host"]}:{p["port"]:<5} {p["protocol"]:<6} | {p["source"]:<8} | {p.get("country")} | {p["status"]}')
if len(d) > 12:
    print(f'  ... +{len(d)-12}')
PY
