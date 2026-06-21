#!/usr/bin/env bash
# Prova de rede: mostra para ONDE o processo do gateway (node) está conectado.
# COM proxy ativo numa sessão conectada, o node abre TCP para o IP:porta do PROXY
# (não direto para o WhatsApp). SEM proxy, conecta direto a IPs do WhatsApp.
set -uo pipefail
H=http://localhost:3000

TOKEN=$(curl -s -X POST "$H/api/auth/login" \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])' 2>/dev/null)

echo "=== Proxies no pool (host:porta | status | IP de saída) ==="
if [ -n "${TOKEN:-}" ]; then
  curl -s "$H/api/proxies" -H "authorization: Bearer $TOKEN" \
    | python3 -c 'import sys,json;[print(f" #{p[\"position\"]:>3} {p[\"host\"]}:{p[\"port\"]} | {p[\"status\"]} | exit={p[\"exitIp\"]}") for p in json.load(sys.stdin)]' 2>/dev/null
fi

echo
echo "=== Assignment por sessão (mode | proxy atual em uso) ==="
if [ -n "${TOKEN:-}" ]; then
  curl -s "$H/api/sessions" -H "authorization: Bearer $TOKEN" \
    | python3 -c 'import sys,json;[print(f" {s[\"name\"]} ({s[\"status\"]}) id={s[\"id\"]}") for s in json.load(sys.stdin)]' 2>/dev/null
  for SID in $(curl -s "$H/api/sessions" -H "authorization: Bearer $TOKEN" | python3 -c 'import sys,json;[print(s["id"]) for s in json.load(sys.stdin)]' 2>/dev/null); do
    curl -s "$H/api/sessions/$SID/proxy" -H "authorization: Bearer $TOKEN" \
      | python3 -c 'import sys,json;a=json.load(sys.stdin);print(f"  -> mode={a[\"mode\"]} strategy={a[\"strategy\"]} currentProxyId={a[\"currentProxyId\"]}")' 2>/dev/null
  done
fi

echo
echo "=== Conexões TCP estabelecidas do processo node (egress real) ==="
ss -tnp 2>/dev/null | grep -i node || echo "(instale iproute2 ou rode com permissão p/ ver o nome do processo)"

echo
echo "Como ler:"
echo " - COM proxy: o node tem ESTAB para o IP:porta de um proxy do pool acima — e NÃO direto p/ WhatsApp."
echo " - SEM proxy: o node tem ESTAB direto para IPs do WhatsApp (ex.: *.whatsapp.net / 157.240.x.x / 31.13.x.x / 5222 ou 443)."
