# Sessão: e10-baileys-midia

- **Status:** ✅ DONE — E10/P-050/P-075 no PR #11, sem merge/deploy.
- **Início:** 26/09/2026 18:04 BRT.
- **Objetivo:** limitar o download de mídia recebida, aplicar o proxy HTTP/HTTPS da sessão ao fetch da CDN e recuperar URL expirada por reupload com teto.
- **Escopo:** `sessions/infrastructure/baileys`, resolução/factory do proxy para a mesma conexão, dependência undici, testes unitários com socket/fetch falsos e documentação da Onda 2 (`MAPA-CODIGO`, referência gerada, `INTEGRACAO`, roteiro, runbook, pendências, estado, sessões e changelog). Ponto global previsto: `apps/gateway/package.json`/`package-lock.json`; `packages/contracts` somente se o payload mudar.
- **Fora do escopo:** E11–E12, `lid-envio-wwebjs`, conta/QR/mídia/mensagem real, merge e deploy.
- **Branch:** `feature/onda2-baileys`, PR #11 aberto para `main`, dependente do PR #10 enquanto este estiver aberto.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** E7–E9 estão em código no PR #11, sem merge/deploy; produção no último SHA documentado `768fb26`, não verificado ao vivo nesta sessão. O canário B é posterior a E12 e à ordem de merge/deploy.
- **SESSOES:** `lid-envio-wwebjs` é a única ATIVA alheia, em escopo disjunto. Avisos E7/E8/E9 exigem preservar dedupe por `(sessionId,keyId)`, `raw`/reação/remetente, pausa 423 e confirmação do timelock apenas pelo RPC, matriz de close com 440 quieto e guardas `stopped`/`connectGeneration`.
- **PENDENCIAS:** assumidas P-050 (espera/proxy do download) e P-075 (404/410 e `ptvMessage`); B-004/B-005/B-007, P-034/P-056 e demais itens da Onda 2 permanecem.
- **ROTEIRO:** mesma branch e PR, documentation-first na versão instalada e fonte oficial, teste sem rede/conta real, validação local, mapa gerado, revisão adversarial, CI verde e mensagem da E11.
- **MAPA-CODIGO §5.1:** o download da rc14 lê `options.dispatcher` no terceiro argumento de `downloadMediaMessage`; `fetchAgent` serve ao upload. Na abertura, a engine passava `{}` e podia esperar indefinidamente. O reupload automático da lib testa `error.status`, mas erro de CDN é Boom `output.statusCode`.
- **E8/E9 DONE e INTEGRACAO:** `session.restricted`, ACK `error` e `lastErrorDetails` são aditivos e não devem mudar nesta etapa. Mensagem de mídia pode sair sem `mediaKey`/`mediaUrl`; consumidores usam `GET .../media` quando a chave existe.
- **Canário:** runbook `how-to/canario-baileys-onda2.md` está preparado e não executado; os testes E10 usaram dados falsos/locais, e a prova de IP de saída pelo proxy e reupload no chip ficam para a janela do dono.
- **Versões locais na abertura:** Node `v26.0.0` informa `process.versions.undici=8.0.2`; Dockerfile do gateway fixa `node:26.10.0`; `npm ls` confirmou Baileys `7.0.0-rc14` e wwebjs `1.34.7`, sem undici direto. `npm view` mostrou rc14/1.34.7 atuais e `undici@8.11.2` como latest. Fontes oficiais foram confirmadas antes da alteração da API, no item seguinte.
- **Fontes oficiais consultadas ANTES do código:** [Baileys tag rc14 — download](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/messages.ts), [fetch com `dispatcher`](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/messages-media.ts) e [reupload sem teto](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/messages-send.ts); [Node 26.10.0 `fetch`/dispatcher](https://nodejs.org/download/release/v26.10.0/docs/api/globals.html#custom-dispatcher), [Undici 8.10.2 `ProxyAgent`](https://github.com/nodejs/undici/blob/v8.10.2/docs/docs/api/ProxyAgent.md) e [Dispatcher.destroy](https://github.com/nodejs/undici/blob/v8.10.2/docs/docs/api/Dispatcher.md#dispatcherdestroyerror-callback). O [vendored Undici do Node 26.10.0](https://github.com/nodejs/node/blob/v26.10.0/deps/undici/src/package.json#L3) é 8.10.2; por isso a dependência direta foi pinada em 8.10.2. Context7 retornou Baileys `master` com assinatura incompatível e foi descartado em favor da tag/tipos instalados. A API rc14 ignora `signal` no `getHttpStream`; `fetchAgent` é upload, não download.

## Progresso

- 18:04 — leitura R9, branch/PR e arquivos locais não versionados conferidos; abertura da sessão. `.codex/`, `AGENTS.md`, `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts` serão preservados.
- 18:12 — proxy escolhido uma vez por conexão para socket e CDN; dispatcher por mídia, teto global 90 s + reupload até 20 s, SOCKS só metadados.
- 18:25 — revisão adversarial sem bloqueio; 8 testes de mídia e 4 de proxy passaram com rc14/fetch/socket falsos e proxy HTTP local. `npm run test:unit`: 558 gateway + 180 painel; `npm run test`: 843 gateway + 180 painel. Typecheck, depcruise, ambos os builds e mapa gerado passaram. Lint/formato dos arquivos da E10 passaram; os comandos globais só falham em `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts` não versionados e preexistentes (fora do PR). `npm run lint` apontou 2 imports `require()` em `seed-mock.js`; `npm run format:check` apontou os dois arquivos. Nenhum deles foi alterado.
- 18:27 — código, testes e documentação de fluxo no commit `b489b21` enviados à branch do PR #11; corpo do PR atualizado com a E10. CI [`ci`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36272852120/job/108489971382) e [`imagens`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36272852120/job/108489971419) verdes; checagem de advisories também passou.

## RESULTADO para quem não participou

- P-050: download recebido espera no máximo 90 s no total. Cada mídia cria um dispatcher Undici próprio, repassado ao `fetch` da rc14 e destruído após conclusão/timeout. HTTP/HTTPS usam o mesmo proxy escolhido para o WebSocket/upload; SOCKS mantém a conexão pelo Agent existente e publica apenas metadados, sem acesso direto à CDN. Sem proxy, a conexão usa dispatcher direto como já usava IP direto.
- P-075: erro Boom `output.statusCode` 404/410 pede reupload uma vez por `sock.updateMediaMessage` com teto de 20 s dentro dos 90 s e tenta um segundo download. Vídeo redondo `ptvMessage` é apresentado como `videoMessage` só para o reupload da rc14; `raw` original conserva `ptvMessage` e recebe a URL atualizada. Falhas publicam um evento `message` com metadados e sem `mediaKey`, como antes. O payload público não mudou; `packages/contracts` permanece válido.
- Fontes oficiais, versões instaladas e alternativas rejeitadas estão no ECO e na D-034. A dedupe da E7, a pausa da E8 e a matriz/versão da E9 passaram na regressão completa. Não houve conta, QR em aparelho, mídia/mensagem real, merge ou deploy. A saída real pelo proxy e o resultado no chip de teste seguem no canário após E12/merge/deploy B.
- Limite residual P-087: o prazo externo interrompe a espera e o fetch, mas não remove o listener interno de `messages.media-update` da rc14 se o reupload nunca responder. O listener deve ser tratado em etapa separada com prova de cleanup; um retorno tardio não emite segundo evento nem grava segundo binário.
- Próxima etapa: [E11/P-051](../ROTEIRO-ONDAS-2026-09.md#e11--baileys-patch-mínimo-da-rc14-p-051) na mesma branch/PR, com patch mínimo comprovado de Curve.verify e stream. P-087 exige análise própria; não atribuir seu cancelamento ao patch sem teste.

## RECONCILIAÇÃO DOCUMENTAL (R3)

- API pública/payload inalterado → `packages/contracts` não mudou; `docs/INTEGRACAO.md` descreve o prazo, o fallback e o `mediaKey` opcional.
- Fluxo e fronteira sessions/proxies alterados → `docs/ARQUITETURA.md`, `docs/MAPA-CODIGO.md` (§5.1, §6.1 e fluxos) e `docs/reference/mapa-codigo/` regenerado e conferido com `--check`.
- Política operacional/limite → D-034, P-050/P-075/P-087 em `PENDENCIAS.md` e `docs/how-to/canario-baileys-onda2.md` como plano futuro, sem alegar canário executado.
- Etapa/checkpoint → `docs/ROTEIRO-ONDAS-2026-09.md`, `docs/SESSOES.md`, `docs/ESTADO.md`, `CHANGELOG.md` e este DONE. Nenhum gatilho do diff ficou sem documento.

## Checkpoint R9

- **Commits/PR:** E10 em `b489b21`; fechamento R9 em commit documental posterior, ambos no PR #11. Jobs `ci`/`imagens` do código verdes no run `36272852120`; o commit de fechamento tem CI próprio no PR.
- **BLOQUEADO EM VOCÊ:** merge do PR #11, deploy manual B e canário com chip/egress real aguardam a E12 e a ordem do dono. B-004/B-005/B-007, P-034 e P-056 continuam pendentes em `PENDENCIAS.md`; P-087 é limite técnico residual da E10.
- **DOCS TOCADAS PELO DIFF:** `INTEGRACAO`, `ARQUITETURA`, `MAPA-CODIGO`/referência gerada, runbook do canário, `PENDENCIAS`, `DECISOES`, `ROTEIRO-ONDAS`, `SESSOES`, `ESTADO`, `CHANGELOG` e este DONE. Nenhum contrato/payload novo.
