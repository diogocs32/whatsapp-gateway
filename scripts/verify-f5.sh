#!/usr/bin/env bash
# Verifica que as rotas F5 estão no ar (read-only). 404 = rota não existe; 400/200 = existe.
set -uo pipefail
python3 - <<'PY'
import json, urllib.request, urllib.error
H = 'http://localhost:3000'

def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(H + path, data=data, method=method)
    req.add_header('content-type', 'application/json')
    if token: req.add_header('authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except Exception: return e.code, None

_, tok = call('POST', '/api/auth/login', {'username':'admin','password':'admin123'})
token = tok['token']
_, sessions = call('GET', '/api/sessions', token=token)
sid = sessions[0]['id'] if sessions else 's1'
status = sessions[0]['status'] if sessions else '?'
print(f'sessão {sid} status={status}')

for label, m, path, body in [
    ('GET groups', 'GET', f'/api/sessions/{sid}/groups', None),
    ('POST contacts/check', 'POST', f'/api/sessions/{sid}/contacts/check', {'numbers':['5511999999999']}),
    ('POST channels', 'POST', f'/api/sessions/{sid}/channels', {'name':'x'}),
]:
    st, res = call(m, path, body, token)
    note = '404 = rota AUSENTE!' if st == 404 else ('OK rota existe' if st in (200,201,400) else '')
    sample = res if (st in (200,201) and isinstance(res, list) and res) else (res.get('message') if isinstance(res, dict) else res)
    print(f'  {label}: HTTP {st}  {note}  {str(sample)[:80]}')
PY
