#!/usr/bin/env bash
# Verifica, por sessão, qual proxy está ATIVO e confronta com o egress real do node. Dá um veredito.
set -uo pipefail
H=http://localhost:3000
TOKEN=$(curl -s -X POST "$H/api/auth/login" -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
export TOKEN H

python3 - <<'PY'
import os, json, subprocess, urllib.request
H, TOKEN = os.environ['H'], os.environ['TOKEN']

def get(path):
    req = urllib.request.Request(H + path, headers={'authorization': 'Bearer ' + TOKEN})
    return json.load(urllib.request.urlopen(req, timeout=10))

pool = {p['id']: p for p in get('/api/proxies')}
sessions = get('/api/sessions')

ss = subprocess.run(['ss', '-tnp'], capture_output=True, text=True).stdout
ext = [l for l in ss.splitlines()
       if 'node' in l and '127.0.0.1' not in l and '[::1]' not in l and l.strip()]

print("=== Proxy ATIVO por sessão ===")
active_hosts = set()
for s in sessions:
    a = get(f'/api/sessions/{s["id"]}/proxy')
    px = pool.get(a.get('currentProxyId'))
    if px:
        active_hosts.add(px['host'])
        print(f'  {s["name"]} [{s["status"]}] mode={a["mode"]} strat={a["strategy"]} '
              f'-> #{px["position"]} {px["host"]}:{px["port"]} (exit={px.get("exitIp")}, {px["status"]})')
    else:
        print(f'  {s["name"]} [{s["status"]}] mode={a["mode"]} -> (sem proxy ativo)')

print("\n=== Egress externo do node (gateway) ===")
for l in ext:
    print("  ", l.split('users:')[0].strip())

def is_meta(ip):
    return any(ip.startswith(p) for p in ('57.144.', '157.240.', '31.13.', '179.60.', '185.60.21'))

print("\n=== Veredito ===")
for l in ext:
    f = l.split()
    peer = f[4] if len(f) > 4 else ''
    ip = peer.rsplit(':', 1)[0]
    if ip in active_hosts:
        print(f'  OK  {peer}  == proxy ativo  ✅  (WhatsApp saindo pelo proxy)')
    elif is_meta(ip):
        print(f'  !!  {peer}  parece Meta/WhatsApp DIRETO (sem proxy)  ⚠')
    else:
        print(f'  --  {peer}  (outro tráfego, ex.: check de versão Baileys no GitHub)')
PY
