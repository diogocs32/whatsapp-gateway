# Sessão: e12-baileys-pairing-lid

- **Status:** 🟢 ATIVA — E12/P-052, Onda 2.
- **Início:** 26/09/2026 22:31 BRT.
- **Objetivo:** proteger pairing, corrigir pares LID/PN do roster e medir caches/pre-keys com a rc14 instalada, mantendo o contrato público.
- **Escopo:** `modules/sessions` (manager, engine Baileys, controller e testes), medição local de caches e `wa_auth_keys`, docs da Onda 2 (`MAPA-CODIGO`, referência gerada, roteiro, runbook, PENDENCIAS, ESTADO, SESSOES, changelog) e PR. Pontos globais: nenhum payload, migration ou env planejado.
- **Fora do escopo:** P-087, mudanças no patch da E11, sessão WWEBJS alheia, conta/QR em aparelho/mídia/mensagem real, deploy e operação no Dokploy.
- **Branch:** `feature/onda2-baileys-e12`, criada da `origin/main=119635c` após o merge do PR #15.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** E7–E10 e E11/P-051 estão na `main` pelos PRs #11/#15; E12 é a última etapa de código da Onda 2. Produção segue no último SHA documentado `768fb26`, sem conferência ao vivo; deploy B e canário ficam para a janela do dono.
- **SESSOES:** a única sessão ativa alheia é `lid-envio-wwebjs`, com código WWEBJS disjunto. Avisos E7–E11 exigem preservar dedupe/`raw`/reação, pausa E8 com RPC confirmado, matriz E9 e guardas de geração, teto/proxy/reupload E10 e os dois patches/guardas E11. Li as cinco entradas mais recentes do histórico.
- **PENDENCIAS:** assumo P-052. P-087 continua separada, sem tocar no listener interno de reupload. B-004/B-005/B-007, P-034/P-056 e deploy/canário continuam pendentes.
- **ROTEIRO, DONE E11, MAPA-CODIGO §5.1 e runbook:** PR novo e merge após CI verde, sem deploy. A rc14 pode sobrescrever `creds.me` ao pedir código; `registered` sozinho não protege quem pareou por QR. O roster usa `phoneNumber`; fallback só pelo `lidMapping` local. Medir caches antes de decidir externalização, contar pre-keys por sessão e tratar `countryCode: BR` como coerência, sem alegar efeito anti-ban. E11 provou patch da biblioteca real, postinstall, guardas e os dois Dockerfiles; canário com chip continua futuro.

## Progresso

- 22:31 — leitura R9, branch criada de `origin/main=119635c`; arquivos não rastreados preexistentes preservados. `node_modules` confirma `@whiskeysockets/baileys@7.0.0-rc14`.
- 22:34 — `npm view` confirma Baileys `latest=7.0.0-rc14` e wwebjs `latest=1.34.7`. Fontes oficiais da tag: [socket.ts](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/socket.ts) (`requestPairingCode` sobrescreve `creds.me`; `connecting` é emitido no nextTick), [groups.ts](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/groups.ts) (`phoneNumber`/`lid`), [lid-mapping.ts](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Signal/lid-mapping.ts) (`getPNsForLIDs` consulta cache/chaves locais), [Defaults/index.ts](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Defaults/index.ts) (TTLs 1 h/5 min; `countryCode: US`). Tipos e JS compilados instalados conferidos antes da edição. Context7 não está disponível nesta sessão; usei a tag oficial e o pacote instalado.
- 22:43 — código E12 compila. 11 testes unit novos com socket/DB falsos e 9 e2e da rota/banco local passaram; suíte gateway unit 578/578. Fronteiras e typecheck passaram. `lint`/`format:check` globais só acusam `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts`, não rastreados e preexistentes; vou validar os arquivos versionados separadamente. P-087 não foi tocada.
