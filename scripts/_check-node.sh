#!/usr/bin/env bash
# Verificação cirúrgica: reinicia os servidores sob Node 26 e prova a versão de runtime
# (a) pelo log do app (process.version) e (b) pelo binário real do processo via /proc.
set -uo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
. "$NVM_DIR/nvm.sh"
nvm use 26 >/dev/null 2>&1
export PATH="$(dirname "$(nvm which current)"):$PATH"
hash -r

echo "shell node: $(node -v)  ($(command -v node))"

cd "$HOME/projetos/whatzapp_api"
pkill -f 'nest start' 2>/dev/null || true
pkill -f 'bin/vite' 2>/dev/null || true
sleep 2

nohup npm run gateway:dev > gw.log 2>&1 &
nohup npm run dashboard:dev > dash.log 2>&1 &
echo "subindo... aguardando 25s"
sleep 25

echo "=== gateway log (runtime + start) ==="
grep -E 'Runtime: Node|successfully started|Conectado ao' gw.log | tail -4

P3="$(ss -tlnp 2>/dev/null | grep ':3000' | grep -oP 'pid=\K[0-9]+' | head -1)"
echo "processo na :3000 -> $(readlink -f /proc/${P3}/exe 2>/dev/null)"

echo "=== /health ==="
curl -s http://localhost:3000/health; echo

echo "=== vite ==="
grep -iE 'ready|Local:' dash.log | tail -2
