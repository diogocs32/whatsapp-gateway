#!/usr/bin/env bash
# Reporta presença/tamanho de WEBSHARE_API_KEY no apps/gateway/.env SEM imprimir o valor.
set -uo pipefail
python3 - <<'PY'
path = 'apps/gateway/.env'
val = None
try:
    with open(path) as f:
        for line in f:
            line = line.rstrip('\r\n')
            if line.startswith('WEBSHARE_API_KEY='):
                val = line[len('WEBSHARE_API_KEY='):]
                break
except FileNotFoundError:
    print('arquivo não encontrado:', path)
    raise SystemExit
if val is None:
    print('linha "WEBSHARE_API_KEY=" NÃO encontrada')
else:
    print(f'WEBSHARE_API_KEY presente; comprimento do valor = {len(val)} chars')
PY
