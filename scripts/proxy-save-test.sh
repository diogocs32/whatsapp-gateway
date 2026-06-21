#!/usr/bin/env bash
# Reproduz o que a UI faz ao salvar um proxy SINGLE numa sessão: PUT com proxyId + GET de volta.
set -uo pipefail
python3 - <<'PY'
import json, urllib.request
H = 'http://localhost:3000'

def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(H + path, data=data, method=method)
    req.add_header('content-type', 'application/json')
    if token:
        req.add_header('authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

_, tok = call('POST', '/api/auth/login', {'username': 'admin', 'password': 'admin123'})
token = tok['token']
_, sessions = call('GET', '/api/sessions', token=token)
sid = sessions[0]['id']
_, pool = call('GET', '/api/proxies', token=token)
pid = pool[2]['id'] if len(pool) > 2 else pool[0]['id']
print('sessão:', sid, '| proxy alvo:', pid, pool[2]['host'] + ':' + str(pool[2]['port']))

st, res = call('PUT', f'/api/sessions/{sid}/proxy',
               {'mode': 'SINGLE', 'proxyId': pid}, token=token)
print('PUT ->', st, res)

st, res = call('GET', f'/api/sessions/{sid}/proxy', token=token)
print('GET ->', st, res)
print('PERSISTIU?', res.get('mode') == 'SINGLE' and res.get('currentProxyId') == pid)
PY
