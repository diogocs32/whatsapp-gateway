#!/usr/bin/env bash
SID="01KVJHFQB51VT7XAK6RBXVAZWZ" # campanha1
echo "=== login ==="
RESP=$(curl -s -m 10 -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}')
echo "$RESP" | head -c 300; echo
TOKEN=$(echo "$RESP" | grep -oE '"(token|access_token|accessToken)":"[^"]+"' | head -1 | sed 's/.*:"//;s/"$//')
echo "token: ${TOKEN:0:24}..."
echo "=== start campanha1 ==="
curl -s -m 20 -X POST "localhost:3000/api/sessions/$SID/start" -H "Authorization: Bearer $TOKEN"; echo
