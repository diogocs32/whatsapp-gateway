#!/usr/bin/env bash
# Roda gateway + dashboard garantindo Node 26 (lê .nvmrc).
# Necessário porque shells não-interativos no WSL deixam o /usr/bin (Node 18 do apt)
# sombrear o nvm. Aqui forçamos o binário do nvm para a frente do PATH.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm não encontrado em $NVM_DIR. Instale o nvm e rode: nvm install 26" >&2
  exit 1
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

# Usa a versão do .nvmrc (instala se faltar) e coloca o node do nvm na frente do PATH.
nvm use >/dev/null 2>&1 || nvm install >/dev/null
export PATH="$(dirname "$(nvm which current)"):$PATH"
hash -r

echo "Node em uso: $(node -v)  ($(command -v node))"
case "$(node -v)" in
  v2[2-9].*|v[3-9][0-9].*) : ;;  # >= 22
  *) echo "ERRO: Node $(node -v) é incompatível. Use Node 22.12+ (recomendado 26)." >&2; exit 1 ;;
esac

cd "$REPO_ROOT"
exec npm run dev
