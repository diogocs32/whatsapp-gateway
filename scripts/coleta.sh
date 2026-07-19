#!/usr/bin/env bash
# Coleta da janela de observação/monitoramento do guard-rail (onda M2).
# Carrega a X-Api-Key do cofre local (scripts/coleta.secret.local, gitignored)
# SEM imprimi-la, e roda o coletor read-only contra a produção.
#
# Uso:  bash scripts/coleta.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

VAULT="scripts/coleta.secret.local"
if [[ ! -f "$VAULT" ]]; then
  echo "❌ Cofre não encontrado: $VAULT"
  echo "   Crie o arquivo com a linha: GATEWAY_API_KEY=<sua-x-api-key>"
  exit 1
fi
if grep -q "COLE_AQUI" "$VAULT"; then
  echo "❌ A chave ainda está como COLE_AQUI em $VAULT — cole a X-Api-Key real primeiro."
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "feature/m2-guardrail-ativo" ]]; then
  echo "⚠️  Você está na branch '$branch', não em 'feature/m2-guardrail-ativo'."
  echo "   A coleta acumula em docs/observacao/guardrail-m2.jsonl, que só é versionado na branch da sessão."
  echo "   Rode:  git checkout feature/m2-guardrail-ativo  antes (ou ignore se for só um teste)."
fi

# Carrega a chave sem ecoar (set -a exporta tudo que for definido no source)
set -a
# shellcheck disable=SC1090
source "$VAULT"
set +a

node scripts/guardrail-observe.mjs
echo
echo "✔ Coleta concluída. Para versionar: git add docs/observacao/guardrail-m2.jsonl && git commit -m 'docs(m2): coleta <n>'"
