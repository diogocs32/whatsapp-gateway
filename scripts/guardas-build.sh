#!/bin/sh
# Guardas de build (P-055) — pré-requisito do stop-first (B-004): com stop-first, imagem quebrada
# vira indisponibilidade (não há container antigo segurando a API), então o build tem de FALHAR
# ALTO em vez de gerar uma imagem ruim. Usado pelo apps/gateway/Dockerfile e pelo CI.
# Rodar a partir da raiz do monorepo (ou da raiz do estágio de build da imagem, /app).
#
#   sh scripts/guardas-build.sh patches  → o patch do whatsapp-web.js está aplicado em node_modules
#   sh scripts/guardas-build.sh dist     → o build do gateway gerou apps/gateway/dist/main.js
#   sh scripts/guardas-build.sh deps <dir-dist>
#                                        → todo pacote que o JS compilado usa resolve E carrega
#                                          (pega o MODULE_NOT_FOUND do boot ANTES do deploy)
#   sh scripts/guardas-build.sh prisma   → o 1º comando do entrypoint (Prisma CLI + prisma.config.ts,
#                                          fora do dist) funciona — sem conectar ao banco
set -eu

falha() {
  echo "[guardas-build] FALHA: $1" >&2
  exit 1
}

case "${1:-}" in
  patches)
    ww=node_modules/whatsapp-web.js/src/util
    # Um marcador por arquivo de patches/whatsapp-web.js+1.34.7.patch — linhas ADICIONADAS pelo
    # patch que não existem na lib original (provado em 25/09 reconstruindo o original com
    # `git apply -R`: 0 ocorrências nos dois). Ao mudar o patch, manter um marcador por arquivo.
    # Sem o patch, o fix `$1` (B-002/D-013) e o fix do exposeFunction concorrente somem em silêncio.
    grep -q 'window.WWebJS.getMsgKeyId' "$ww/Injected/Utils.js" ||
      falha "patch do whatsapp-web.js NÃO aplicado em $ww/Injected/Utils.js (patches/ ausente ou patch-package falhou)"
    grep -q 'delete message.__x_id' "$ww/Injected/Utils.js" ||
      falha "patch de mídia __x_id do whatsapp-web.js NÃO aplicado"
    grep -q 'already exists' "$ww/Puppeteer.js" ||
      falha "patch do whatsapp-web.js NÃO aplicado em $ww/Puppeteer.js (patches/ ausente ou patch-package falhou)"
    grep -q 'versionFilePath(version)' "node_modules/whatsapp-web.js/src/webCache/LocalWebCache.js" ||
      falha "patch do cache de versões do whatsapp-web.js NÃO aplicado"
    grep -q '_appStateSyncFlight' "node_modules/whatsapp-web.js/src/Client.js" ||
      falha "patch single-flight do whatsapp-web.js NÃO aplicado"
    echo "[guardas-build] patches OK (whatsapp-web.js: Client.js + Utils.js + Puppeteer.js + LocalWebCache.js)"
    ;;
  dist)
    # O entrypoint roda `node dist/main.js` (apps/gateway/docker-entrypoint.sh). Se o build mudar o
    # layout (ex.: rootDir sobe e sai dist/src/main.js) o `nest build` termina com 0 e a imagem nasce
    # sem entrypoint.
    test -f apps/gateway/dist/main.js ||
      falha "apps/gateway/dist/main.js não existe — o build não gerou o entrypoint do container"
    echo "[guardas-build] dist OK (apps/gateway/dist/main.js)"
    ;;
  deps)
    dir="${2:-}"
    [ -n "$dir" ] || falha "uso: sh scripts/guardas-build.sh deps <diretório do dist>"
    node "$(dirname "$0")/verificar-deps-runtime.cjs" "$dir"
    ;;
  prisma)
    # O entrypoint roda `/app/node_modules/.bin/prisma migrate deploy` a partir de apps/gateway, que
    # carrega o prisma.config.ts (`dotenv/config` + `prisma/config`). `prisma validate` exercita o
    # mesmo binário, o mesmo config e o schema sem conectar ao banco (Prisma 7: "commands like
    # prisma generate don't need a database URL" — docs prisma-config-reference). Pega CLI ou
    # dependência do config que o prune derrubou.
    bin="$PWD/node_modules/.bin/prisma"
    [ -x "$bin" ] || falha "Prisma CLI ausente em $bin (o entrypoint roda 'prisma migrate deploy')"
    (cd apps/gateway && "$bin" validate >/dev/null) ||
      falha "prisma validate falhou em apps/gateway (CLI, prisma.config.ts ou schema)"
    echo "[guardas-build] prisma OK (CLI + prisma.config.ts + schema)"
    ;;
  *)
    echo "uso: sh scripts/guardas-build.sh patches|dist|deps <dir>|prisma" >&2
    exit 2
    ;;
esac
