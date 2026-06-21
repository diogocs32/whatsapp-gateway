#!/usr/bin/env bash
cd /home/diogocs32/projetos/whatzapp_api || exit 1
docker compose exec -T postgres psql -U gateway -d gateway -P pager=off -c \
  'SELECT name, status, "meJid", "updatedAt" FROM wa_sessions ORDER BY "updatedAt" DESC;'
