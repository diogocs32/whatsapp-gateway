# Sessão: e11-baileys-patch

- **Status:** ✅ DONE — E11/P-051 no PR #15 draft, sem merge/deploy.
- **Início:** 26/09/2026 20:22 BRT.
- **Objetivo:** corrigir na rc14 instalada a validação de assinatura e o erro de stream de mídia, com patch-package mínimo e provas sintéticas.
- **Escopo:** `patches/@whiskeysockets+baileys+7.0.0-rc14.patch`, spec da biblioteca real em `apps/gateway/src/modules/sessions/infrastructure/baileys/`, guardas de build e workflow CI, Dockerfiles do gateway e painel, docs da Onda 2 (`MAPA-CODIGO`, referência gerada, roteiro, runbook, PENDENCIAS, DECISOES, ESTADO, SESSOES, changelog) e PR novo. Pontos globais: `patches/`, `scripts/guardas-build.sh`, `.github/workflows/ci.yml`. `packages/contracts` não muda sem payload novo.
- **Fora do escopo:** E12/P-052, P-087 (avaliada separadamente), PRs #2789/#2765/#2781 sem reprodução, conta, QR em aparelho, mídia/mensagem real, merge e deploy.
- **Branch:** `feature/onda2-baileys-e11-e12`, criada de `origin/main` atualizado em `960471e`; [PR #15 draft](https://github.com/diogocs32/whatsapp-gateway/pull/15) para `main`.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** PR #11 (E7–E10) e #13 estão na `main`; código e produção divergem. Último SHA de produção documentado `768fb26`, sem verificação ao vivo; deploy B e canário só após E12/integração/ordem do dono.
- **SESSOES:** única sessão ativa alheia `lid-envio-wwebjs`, escopo disjunto. Avisos E7–E10 exigem preservar dedupe e `raw`/remetente/reação, pausa 423 confirmada apenas pelo RPC direto, matriz de close e guardas `stopped`/`connectGeneration`, teto de mídia 90 s, proxy escolhido uma vez e fallback sem binário.
- **PENDENCIAS:** P-051 assumida; P-087 fica aberta em revisão separada, sem atribuir cancelamento ao patch. B-004/B-005/B-007, P-034/P-056 e os canários seguem pendentes.
- **ROTEIRO:** um chat para E11, nova branch/PR da `main`; patch no JS compilado, lib real para Curve, fixture sintética para stream, postinstall/guardas/dois Dockerfiles/CI; próxima mensagem pronta é E12.
- **E10 DONE/diário:** P-050/P-075 entregues com dispatcher Undici da mesma escolha de proxy, 90 s totais e reupload 20 s; `ptvMessage` preserva `raw`. P-087 é listener interno sem cancelamento; produção não recebeu E10.
- **MAPA-CODIGO §5.1 e runbook:** Curve.verify da rc14 ignora o booleano; usado no Noise e no pareamento. O canário B com chip e saída real pelo proxy pertence à janela do dono após E12/merge/deploy.
- **Fontes oficiais verificadas antes da edição:** PR [#2751](https://github.com/WhiskeySockets/Baileys/pull/2751) foi mergeado em `develop` e prova o retorno de `verifySignature` e o vazamento de `domainType` entre devices. PR [#2815](https://github.com/WhiskeySockets/Baileys/pull/2815) foi fechado em 26/09 como duplicado do [#2716](https://github.com/WhiskeySockets/Baileys/pull/2716), que usa `pipeline` para propagar erros e encerrar a fonte. `npm ls` confirmou `@whiskeysockets/baileys@7.0.0-rc14`; `lib/Utils/{crypto,signal,messages-media}.js` instalados mostram os três ramos afetados. Context7 devolveu `master` e não substitui a rc14 instalada.

## Progresso

- 20:22 — abertura R9, `origin/main=960471e`, branch própria; arquivos não rastreados preexistentes preservados.
- 20:24 — rc14 sem patch reproduziu `Curve.verify(invalid)=true` e contaminação de domínio hosted; PRs oficiais #2751/#2815/#2716 e os três JS instalados conferidos antes da edição.
- 20:25 — patch-package de 62 linhas só nos três JS compilados; cinco testes focados com a rc14 real passaram. `npm ci` reaplicou os dois patches pelo postinstall `--error-on-fail`.
- 20:30 — 567 unit gateway, 853 gateway no total e 180 painel locais; typechecks dos três projetos, fronteiras e mapa gerado verdes. Lint/formato globais falham só nos `seed-mock` não rastreados e preexistentes; lint sem eles e formato dos arquivos tocados passaram. Builds dos dois Dockerfiles passaram, inclusive postinstall e guardas na imagem final do gateway. `Curve.verify` válido/inválido passou dentro da imagem final. Sem conta, QR, mídia ou mensagem real.
- 20:32 — commit de código e docs `9e82ec7` enviado à branch; PR #15 draft aberto para `main`.
- 20:37 — jobs `ci` e `imagens` verdes no run `36279808592`; `advisories` verde no `36279808796`. Encerramento documental R9 preparado na mesma branch/PR.

## Encerramento (R9)

- **Resultado para quem não participou:** o patch `@whiskeysockets+baileys+7.0.0-rc14.patch` altera só `lib/Utils/crypto.js`, `signal.js` e `messages-media.js`. `Curve.verify` agora retorna o booleano real; domínio hosted é calculado por device; o stream de mídia usa `pipeline` para que erro do corpo HTTP chegue ao consumidor e cancelamento encerre a fonte. O patch do wwebjs continua aplicado. Nenhuma rota, payload, migration, pacote ou contrato público mudou.
- **Provas:** 5 testes novos com a rc14 real e fixture sintética; 567 unit gateway, 853 gateway total, 180 painel; typechecks dos três projetos, fronteiras, mapa, postinstall, guardas e dois Dockerfiles locais. O guard e `Curve.verify` passaram dentro da imagem final. `npm run lint` e `npm run format:check` globais só esbarram em `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts`, arquivos não rastreados que já existiam antes da branch; lint excluindo esses arquivos e formato dos arquivos versionados passaram. Jobs `ci` e `imagens` verdes no [run 36279808592](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36279808592) do commit `9e82ec7`; `advisories` verde no run `36279808796`.
- **P-087 separada:** `pipeline` cancela o stream HTTP, mas não o `waitForMsgMediaUpdate` interno do reupload; o listener segue aberto até resposta/fechamento do socket. A P-087 continua no quadro com verificação própria, sem ocorrência observada em produção.
- **Reconciliação documental (diff × R3):** `patches/`/guarda/CI/Dockerfiles exigiram atualização do `how-to/canario-baileys-onda2.md` (`revisado em`), D-036, MAPA-CODIGO §5.1, referência gerada e roteiro. A onda ainda não terminou: E12/P-052 fica pendente. `ESTADO.md`, `SESSOES.md`, `PENDENCIAS.md` e `CHANGELOG.md` foram reconciliados. `Docs-n/a`: `INTEGRACAO.md` e `packages/contracts` — não houve mudança de rota/payload; `ARQUITETURA.md` — nenhum provider público, módulo ou tabela mudou; env examples — nenhuma env nova.
- **Pendências:** E12/P-052 na mesma branch/PR; P-087 revisão separada; P-034/P-056 e B-004/B-005/B-007 continuam conforme `PENDENCIAS.md`. Canário de handshake/QR/código/reconexão/mídia e saída real pelo proxy só depois de E12, merge e deploy B na janela do dono.
- **BLOQUEADO EM VOCÊ:** para canário/deploy B, B-004 (stop-first), B-005 (backup/restore) e B-007 (chip/teste controlado), além de ordem explícita de merge e deploy. Nenhum deles impede o código da E12.
- **DOCS TOCADAS PELO DIFF:** `CHANGELOG.md`, `docs/DECISOES.md`, `docs/ESTADO.md`, `docs/SESSOES.md`, `docs/SESSOES_ARQUIVO.md`, `docs/PENDENCIAS.md`, `docs/MAPA-CODIGO.md`, `docs/ROTEIRO-ONDAS-2026-09.md`, `docs/reference/mapa-codigo/`, `docs/how-to/canario-baileys-onda2.md` e este DONE.
- **Próximo chat:** executar E12/P-052 usando a mensagem pronta em `docs/ROTEIRO-ONDAS-2026-09.md`, na mesma branch e PR #15.
