#!/usr/bin/env bash
# Coleta manual de observação do guard-rail. A janela M2 de julho está arquivada.
# Carrega a X-Api-Key do cofre local (scripts/coleta.secret.local, gitignored)
# SEM imprimi-la. Com enforce ligado, GET /guardrail pode transicionar estado/emitir evento;
# execute apenas em janela operacional aprovada.
#
# Uso: bash scripts/coleta.sh docs/observacao/guardrail-AAAA-MM-DD.jsonl
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

OUT="${1:-}"
if [[ -z "$OUT" || "$OUT" == "docs/observacao/guardrail-m2.jsonl" ]]; then
  echo "Informe um novo arquivo JSONL; a janela M2 histórica é imutável."
  exit 1
fi

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

# Carrega a chave sem ecoar (set -a exporta tudo que for definido no source)
set -a
# shellcheck disable=SC1090
source "$VAULT"
set +a

node scripts/guardrail-observe.mjs "$OUT"
echo
echo "✔ Coleta concluída em $OUT. Revise os dados antes de versionar."
