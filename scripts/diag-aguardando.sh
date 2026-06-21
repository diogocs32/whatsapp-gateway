#!/usr/bin/env bash
# Diagnóstico read-only do "Aguardando mensagem" — NÃO reinicia nada.
cd /home/diogocs32/projetos/whatzapp_api || exit 1

echo "===== 1) AUTH KEYS por tipo (campanha1) ====="
docker compose exec -T postgres psql -U gateway -d gateway -P pager=off -c \
  'SELECT type, count(*) FROM wa_auth_keys WHERE "sessionId" = (SELECT id FROM wa_sessions WHERE name = $$campanha1$$) GROUP BY type ORDER BY 2 DESC;'

echo
echo "===== 2) updatedAt das ULTIMAS sessions Signal escritas (campanha1) ====="
docker compose exec -T postgres psql -U gateway -d gateway -P pager=off -c \
  'SELECT type, "keyId", "updatedAt" FROM wa_auth_keys WHERE "sessionId" = (SELECT id FROM wa_sessions WHERE name = $$campanha1$$) AND type = $$session$$ ORDER BY "updatedAt" DESC LIMIT 8;'

echo
echo "===== 3) ULTIMAS 6 fromMe (destinatario + tem raw?) ====="
docker compose exec -T postgres psql -U gateway -d gateway -P pager=off -c \
  'SELECT type, "chatJid", (raw IS NOT NULL) AS hr, "timestamp" FROM wa_messages WHERE "fromMe" = true ORDER BY "timestamp" DESC LIMIT 6;'
