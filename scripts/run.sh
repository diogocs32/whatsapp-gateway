#!/usr/bin/env bash
# Wrapper: ativa o Node do .nvmrc (vence o shadow do /usr/bin) e executa o comando.
# Uso: bash scripts/run.sh <comando...>   (ex.: bash scripts/run.sh npm install)
set -uo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use >/dev/null 2>&1 || nvm use 26 >/dev/null 2>&1
export PATH="$(dirname "$(nvm which current)"):$PATH"
hash -r

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "[run.sh] Node $(node -v) | $*"
exec "$@"
